import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CohereClient } from "cohere-ai";

const cohere = new CohereClient({
  token: process.env.cohere_api_key || "",
});

// Centralized Cohere model configuration
const COHERE_MODEL = process.env.COHERE_MODEL || "command-r-08-2024";

interface SupervisorData {
  userId: number;
  name: string;
  specialization: string;
  description: string;
  domains: string;
  skills: string;
  achievements: string;
  maxGroups: number;
  currentGroups: number;
  workloadPercentage: number;
  assignedGroupIds: number[];
}

interface GroupData {
  groupId: number;
  groupName: string;
  supervisorId: number | null;
  memberCount: number;
  semanticMatches?: string;
}

interface PanelSuggestion {
  name: string;
  description: string;
  minSupervisors: number;
  maxSupervisors: number;
  supervisors: Array<{
    supervisorId: number;
    role: "chair" | "member";
    name: string;
    reason: string;
  }>;
  groups: number[];
  rationale: string;
}

// POST - Get AI suggestions for panel creation
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "coordinator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { query, context, mode, cohort = 'REGULAR', fypPhase = 'FYP_1' } = body; // mode can be 'chat' or 'auto-generate'

    // Auto-generate mode: Create complete panel suggestions
    if (mode === "auto-generate") {
      return await handleAutoGeneratePanels(userId, cohort, fypPhase);
    }

    // Chat mode: Answer questions
    if (!query) {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    // Get coordinator's campus
    const coordinator = await prisma.fYPCoordinator.findUnique({
      where: { userId },
      select: { campusId: true },
    });

    if (!coordinator) {
      return NextResponse.json(
        { error: "Coordinator not found" },
        { status: 404 },
      );
    }

    const { campusId } = coordinator;

    // Gather comprehensive context if not provided
    let contextData = context;

    if (!contextData) {
      // Get supervisors with workload
      const supervisors = await prisma.user.findMany({
        where: {
          role: "supervisor",
          supervisor: { campusId },
        },
        select: {
          userId: true,
          name: true,
          email: true,
          supervisor: {
            select: {
              specialization: true,
              maxGroups: true,
              totalGroups: true,
              domains: true,
              skills: true,
              achievements: true,
              description: true,
            },
          },
        },
      });

      // Get groups with supervisor assignments filtered by cohort and phase
      const groups = await prisma.group.findMany({
        where: {
          cohort: cohort as any,
          fypPhase: fypPhase as any,
          students: {
            some: {
              campusId,
              groupId: { not: null },
            },
          },
          isFull: true,
          projectId: { not: null },
        },
        select: {
          groupId: true,
          groupName: true,
          supervisorId: true,
          students: {
            select: {
              userId: true,
              user: { select: { name: true } },
            },
          },
        },
      });

      // Get existing panels filtered by cohort and phase
      const existingPanels = await prisma.evaluationPanel.findMany({
        where: { 
          campusId,
          cohort: cohort as any,
          fypPhase: fypPhase as any
        },
        include: {
          panelMembers: {
            select: {
              supervisorId: true,
            },
          },
          groupAssignments: {
            select: {
              groupId: true,
            },
          },
        },
      });

      contextData = {
        totalSupervisors: supervisors.length,
        totalGroups: groups.length,
        totalExistingPanels: existingPanels.length,
        supervisors: supervisors.map((s) => ({
          userId: s.userId,
          name: s.name,
          specialization: s.supervisor?.specialization || "Not specified",
          description: s.supervisor?.description || "",
          domains: s.supervisor?.domains || "",
          skills: s.supervisor?.skills || "",
          achievements: s.supervisor?.achievements || "",
          maxGroups: s.supervisor?.maxGroups || 0,
          currentGroups: s.supervisor?.totalGroups || 0,
          workloadPercentage: s.supervisor?.maxGroups
            ? Math.round(
                ((s.supervisor.totalGroups || 0) / s.supervisor.maxGroups) *
                  100,
              )
            : 0,
        })),
        groups: groups.map((g) => ({
          groupId: g.groupId,
          groupName: g.groupName || `Group ${g.groupId}`,
          supervisorId: g.supervisorId,
          memberCount: g.students.length,
        })),
        existingPanels: existingPanels.map((p) => ({
          name: p.name,
          memberCount: p.panelMembers.length,
          groupCount: p.groupAssignments.length,
        })),
      };
    }

    // Build comprehensive prompt for Cohere with supervisor profiles
    const supervisorProfiles = contextData.supervisors
      .map((s: any) => {
        const parts = [
          `${s.name}:`,
          `Specialization: ${s.specialization}`,
          `Workload: ${s.currentGroups}/${s.maxGroups} groups (${s.workloadPercentage}%)`,
        ];

        if (s.domains) parts.push(`Research Domains: ${s.domains}`);
        if (s.skills) parts.push(`Skills: ${s.skills}`);
        if (s.achievements) parts.push(`Achievements: ${s.achievements}`);

        return parts.join(" | ");
      })
      .join("\n");

    const prompt = `You are an expert FYP coordinator assistant. Answer the question based on supervisor profiles.

AVAILABLE SUPERVISORS:
${supervisorProfiles}

COORDINATOR'S QUESTION:
${query}

Provide a clear answer in 2-3 sentences. Recommend specific supervisor(s) by name based on their skills, achievements, and specialization that match the question.`;

    // Call Cohere API
    const response = await cohere.chat({
      model: COHERE_MODEL,
      message: prompt,
      temperature: 0.5,
      maxTokens: 300,
      preamble:
        "You are a helpful assistant. Provide clear, specific recommendations in 2-3 sentences mentioning supervisor names.",
    });

    const suggestion = response.text;

    // Parse and structure the response
    return NextResponse.json({
      success: true,
      suggestion,
      contextUsed: {
        supervisorCount: contextData.totalSupervisors,
        groupCount: contextData.totalGroups,
        panelCount: contextData.totalExistingPanels,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting AI suggestions:", error);
    return NextResponse.json(
      {
        error: "Failed to get AI suggestions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Auto-generate optimal evaluation panels using AI
async function handleAutoGeneratePanels(userId: number, cohort: string, fypPhase: string) {
  try {
    // Get coordinator's campus
    const coordinator = await prisma.fYPCoordinator.findUnique({
      where: { userId },
      select: { campusId: true },
    });

    if (!coordinator) {
      return NextResponse.json(
        { error: "Coordinator not found" },
        { status: 404 },
      );
    }

    const { campusId } = coordinator;

    // Get all supervisors with their groups
    const supervisors = await prisma.user.findMany({
      where: {
        role: "supervisor",
        supervisor: { campusId },
      },
      select: {
        userId: true,
        name: true,
        email: true,
        supervisor: {
          select: {
            specialization: true,
            maxGroups: true,
            totalGroups: true,
            domains: true,
            skills: true,
            achievements: true,
            description: true,
          },
        },
      },
    });

    // Get all groups with supervisor assignments filtered by cohort and phase
    const groups = await prisma.group.findMany({
      where: {
        cohort: cohort as any,
        fypPhase: fypPhase as any,
        students: {
          some: {
            campusId,
            groupId: { not: null },
          },
        },
        supervisorId: { not: null },
      },
      select: {
        groupId: true,
        groupName: true,
        supervisorId: true,
        projectId: true,
        students: {
          select: {
            userId: true,
            user: { select: { name: true } },
          },
        },
      },
    });

    // Get all associated projects to perform Pinecone semantic matching
    const groupIds = groups.map((g) => g.groupId);
    const projectIds = groups
      .map((g) => g.projectId)
      .filter((id): id is number => id !== null);

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { groupId: { in: groupIds } },
          { projectId: { in: projectIds } },
        ],
      },
      select: {
        projectId: true,
        groupId: true,
        title: true,
        description: true,
        abstractText: true,
      },
    });

    // Generate semantic supervisor matches via Pinecone for each group's project
    const { generateEmbedding } = await import("@/lib/cohere");
    const { matchSupervisorsForProject } = await import("@/lib/pinecone");

    const groupSemanticMatches = await Promise.all(
      groups.map(async (g) => {
        const project =
          projects.find((p) => p.groupId === g.groupId) ||
          (g.projectId ? projects.find((p) => p.projectId === g.projectId) : null);

        if (!project) return { groupId: g.groupId, matchesText: "" };

        const textToEmbed = [
          project.title,
          project.abstractText || "",
          project.description || "",
        ]
          .filter(Boolean)
          .join(" ");

        if (!textToEmbed.trim()) return { groupId: g.groupId, matchesText: "" };

        try {
          const embedding = await generateEmbedding(textToEmbed);
          const matches = await matchSupervisorsForProject(embedding, 3, campusId);

          if (matches.length === 0) return { groupId: g.groupId, matchesText: "" };

          const matchesText = matches
            .map((match) => {
              const supervisorName =
                supervisors.find((s) => s.userId === match.supervisorId)?.name ||
                `Supervisor ${match.supervisorId}`;
              return `${supervisorName} (Similarity: ${Math.round(match.score * 100)}%)`;
            })
            .join(", ");

          return {
            groupId: g.groupId,
            matchesText: `Semantic Supervisor Matches: ${matchesText}`,
          };
        } catch (error) {
          console.error(`Error matching supervisors for group ${g.groupId}:`, error);
          return { groupId: g.groupId, matchesText: "" };
        }
      })
    );

    // Transform data for AI processing
    const supervisorData: SupervisorData[] = supervisors.map((s) => {
      const assignedGroupIds = groups
        .filter((g) => g.supervisorId === s.userId)
        .map((g) => g.groupId);

      return {
        userId: s.userId,
        name: s.name,
        specialization: s.supervisor?.specialization || "Not specified",
        description: s.supervisor?.description || "",
        domains: s.supervisor?.domains || "",
        skills: s.supervisor?.skills || "",
        achievements: s.supervisor?.achievements || "",
        maxGroups: s.supervisor?.maxGroups || 0,
        currentGroups: s.supervisor?.totalGroups || 0,
        workloadPercentage: s.supervisor?.maxGroups
          ? Math.round(
              ((s.supervisor.totalGroups || 0) / s.supervisor.maxGroups) * 100,
            )
          : 0,
        assignedGroupIds,
      };
    });

    const groupData: GroupData[] = groups.map((g) => {
      const matchObj = groupSemanticMatches.find((m) => m.groupId === g.groupId);
      return {
        groupId: g.groupId,
        groupName: g.groupName || `Group ${g.groupId}`,
        supervisorId: g.supervisorId,
        memberCount: g.students.length,
        semanticMatches: matchObj ? matchObj.matchesText : "",
      };
    });

    // Build comprehensive prompt for AI
    const prompt = buildAutoGeneratePrompt(supervisorData, groupData);

    // Call Cohere API
    const response = await cohere.chat({
      model: COHERE_MODEL,
      message: prompt,
      temperature: 0.3, // Lower temperature for more consistent results
      maxTokens: 4000,
      preamble:
        "You are an expert FYP evaluation panel organizer. Create balanced, fair panels following all constraints.",
    });

    // Parse AI response to extract panel suggestions
    const panelSuggestions = parseAIPanelSuggestions(
      response.text,
      supervisorData,
      groupData,
    );

    return NextResponse.json({
      success: true,
      panels: panelSuggestions,
      summary: {
        totalPanels: panelSuggestions.length,
        totalSupervisors: supervisorData.length,
        totalGroups: groupData.length,
        averagePanelSize: Math.round(
          supervisorData.length / panelSuggestions.length,
        ),
        averageGroupsPerPanel: Math.round(
          groupData.length / panelSuggestions.length,
        ),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error auto-generating panels:", error);
    return NextResponse.json(
      {
        error: "Failed to auto-generate panels",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

function buildAutoGeneratePrompt(
  supervisors: SupervisorData[],
  groups: GroupData[],
): string {
  // Build supervisor profiles
  const supervisorProfiles = supervisors
    .map((s) => {
      const hasSEExpertise =
        s.specialization?.toLowerCase().includes("software") ||
        s.specialization?.toLowerCase().includes("se") ||
        s.domains?.toLowerCase().includes("software") ||
        s.skills?.toLowerCase().includes("software");

      return `Supervisor ${s.userId} - ${s.name}:
  - Specialization: ${s.specialization}
  - Domains: ${s.domains || "Not specified"}
  - Skills: ${s.skills || "Not specified"}
  - Current Workload: ${s.currentGroups}/${s.maxGroups} groups (${s.workloadPercentage}%)
  - Assigned Groups: [${s.assignedGroupIds.join(", ")}]
  - SE Expertise: ${hasSEExpertise ? "YES" : "NO"}`;
    })
    .join("\n\n");

  // Build group assignments
  const groupAssignments = groups
    .map(
      (g) =>
        `Group ${g.groupId} (${g.groupName}): Supervised by Supervisor ${g.supervisorId}${g.semanticMatches ? ` | ${g.semanticMatches}` : ''}`,
    )
    .join("\n");

  // Calculate optimal panel configuration
  const totalSupervisors = supervisors.length;
  const totalGroups = groups.length;
  const avgGroupsPerSupervisor = totalGroups / totalSupervisors;

  // Dynamic panel count calculation
  let optimalPanelCount: number;
  let optimalSupervisorsPerPanel: number;

  if (totalSupervisors <= 4) {
    optimalPanelCount = 1;
    optimalSupervisorsPerPanel = totalSupervisors;
  } else if (totalSupervisors <= 8) {
    optimalPanelCount = 2;
    optimalSupervisorsPerPanel = Math.ceil(totalSupervisors / 2);
  } else if (totalSupervisors <= 15) {
    optimalPanelCount = 3;
    optimalSupervisorsPerPanel = Math.ceil(totalSupervisors / 3);
  } else if (totalSupervisors <= 24) {
    optimalPanelCount = 4;
    optimalSupervisorsPerPanel = Math.ceil(totalSupervisors / 4);
  } else {
    optimalPanelCount = Math.ceil(totalSupervisors / 6);
    optimalSupervisorsPerPanel = 6;
  }

  const avgGroupsPerPanel = Math.ceil(totalGroups / optimalPanelCount);

  return `You are creating optimal FYP evaluation panels. Analyze the supervisors and groups below, then create balanced panels.

SUPERVISORS (Total: ${supervisors.length}):
${supervisorProfiles}

GROUPS (Total: ${groups.length}):
${groupAssignments}

STATISTICS:
- Average groups per supervisor: ${avgGroupsPerSupervisor.toFixed(1)}
- Recommended panel count: ${optimalPanelCount}
- Recommended supervisors per panel: ${optimalSupervisorsPerPanel}
- Target groups per panel: ~${avgGroupsPerPanel}

REQUIREMENTS:
1. **Balanced Workload**: Distribute supervisors so each panel has similar total group counts. Avoid panels with ${Math.ceil(totalGroups * 0.6)} groups while others have ${Math.ceil(totalGroups * 0.1)}.
2. **SE Expertise**: Each panel MUST have at least one supervisor with Software Engineering expertise.
3. **Supervisor-Group Matching**: Each supervisor MUST be in the panel evaluating their own groups.
4. **Dynamic Panel Size**: Create ${optimalPanelCount} panels. Panel size should be flexible based on workload balance - some panels may have ${optimalSupervisorsPerPanel - 1} supervisors, others ${optimalSupervisorsPerPanel + 1}, as long as workload is balanced.
5. **Expertise Distribution**: Balance technical expertise across panels.
6. **Panel Chair**: Select the most experienced supervisor (based on achievements, workload) as chair for each panel.
7. **Semantic Supervisor-Group Alignment**: Strongly prioritize assigning supervisors to panels evaluating groups where they have high similarity matches (as indicated by the 'Semantic Supervisor Matches' metadata on each group). This aligns evaluation expertise with project content.

INSTRUCTIONS:
Create ${optimalPanelCount} evaluation panels. For each panel, provide:

Panel [Number]: [Descriptive Name]
Description: [Brief description of panel focus]
Min Supervisors: [calculated based on panel members]
Max Supervisors: [calculated based on panel members + 2]
Chair: Supervisor [ID] - [Name] (Reason: [why they're chair])
Members:
  - Supervisor [ID] - [Name] (Role: member, Reason: [expertise/groups])
  - Supervisor [ID] - [Name] (Role: member, Reason: [expertise/groups])
Assigned Groups: [Group IDs]
Total Groups: [count]
Rationale: [Why this composition is balanced and effective]

---

Ensure:
- Every supervisor appears in exactly ONE panel
- Every group is assigned to exactly ONE panel
- Each panel has its supervisors' groups assigned to it
- Workload is balanced (each panel has ~${avgGroupsPerPanel} groups, variance ±${Math.ceil(avgGroupsPerPanel * 0.2)})
- Each panel has SE expertise
- Panel sizes are flexible - prioritize workload balance over fixed supervisor counts

Generate the panels now:`;
}

function parseAIPanelSuggestions(
  aiResponse: string,
  supervisors: SupervisorData[],
  groups: GroupData[],
): PanelSuggestion[] {
  const panels: PanelSuggestion[] = [];

  try {
    // Split response into panel sections
    const panelSections = aiResponse
      .split(/Panel \d+:/i)
      .filter((s) => s.trim());

    for (let i = 0; i < panelSections.length; i++) {
      const section = panelSections[i];

      // Extract panel name
      const nameMatch = section.match(/^([^\n]+)/);
      const name = nameMatch
        ? nameMatch[1].trim()
        : `Evaluation Panel ${i + 1}`;

      // Extract description
      const descMatch = section.match(/Description:\s*([^\n]+)/i);
      const description = descMatch
        ? descMatch[1].trim()
        : "FYP Evaluation Panel";

      // Extract min/max supervisors
      const minMatch = section.match(/Min Supervisors:\s*(\d+)/i);
      const maxMatch = section.match(/Max Supervisors:\s*(\d+)/i);
      const minSupervisors = minMatch ? Math.max(2, parseInt(minMatch[1])) : 3;
      const maxSupervisors = maxMatch ? Math.max(minSupervisors, parseInt(maxMatch[1])) : 5;

      // Extract chair
      const chairMatch = section.match(
        /Chair:\s*Supervisor\s*(\d+)[^\(]*\(Reason:\s*([^\)]+)\)/i,
      );
      const chairId = chairMatch ? parseInt(chairMatch[1]) : null;
      const chairReason = chairMatch
        ? chairMatch[2].trim()
        : "Experienced supervisor";

      // Extract members
      const memberMatches = [];
      const memberRegex =
        /Supervisor\s*(\d+)\s*-\s*([^\(]+)\s*\(Role:\s*member,\s*Reason:\s*([^\)]+)\)/gi;
      let match;
      while ((match = memberRegex.exec(section)) !== null) {
        memberMatches.push(match);
      }

      // Extract assigned groups
      const groupsMatch = section.match(/Assigned Groups:\s*\[([^\]]+)\]/i);
      const assignedGroupIds = groupsMatch
        ? groupsMatch[1]
            .split(",")
            .map((id) => parseInt(id.trim()))
            .filter((id) => !isNaN(id))
        : [];

      // Extract rationale
      const rationaleMatch = section.match(
        /Rationale:\s*([^\n]+(?:\n(?!Panel|---)[^\n]+)*)/i,
      );
      const rationale = rationaleMatch
        ? rationaleMatch[1].trim()
        : "Balanced panel composition";

      // Build supervisor list
      const panelSupervisors: PanelSuggestion["supervisors"] = [];

      // Add chair
      if (chairId) {
        const chairSupervisor = supervisors.find((s) => s.userId === chairId);
        if (chairSupervisor) {
          panelSupervisors.push({
            supervisorId: chairId,
            role: "chair",
            name: chairSupervisor.name,
            reason: chairReason,
          });
        }
      }

      // Add members
      for (const match of memberMatches) {
        const memberId = parseInt(match[1]);
        const memberName = match[2].trim();
        const memberReason = match[3].trim();

        if (memberId !== chairId) {
          // Don't add chair twice
          panelSupervisors.push({
            supervisorId: memberId,
            role: "member",
            name: memberName,
            reason: memberReason,
          });
        }
      }

      // Extract all supervisor IDs (for fallback parsing)
      const allSupervisorMatches = [];
      const supervisorRegex = /Supervisor\s*(\d+)/gi;
      let supMatch;
      while ((supMatch = supervisorRegex.exec(section)) !== null) {
        allSupervisorMatches.push(supMatch);
      }

      // If no supervisors were extracted, try fallback parsing
      if (panelSupervisors.length === 0) {
        const uniqueSupervisorIds: number[] = [];
        const seen = new Set<number>();
        for (const m of allSupervisorMatches) {
          const id = parseInt(m[1]);
          if (!seen.has(id)) {
            seen.add(id);
            uniqueSupervisorIds.push(id);
          }
        }

        uniqueSupervisorIds.forEach((id, index) => {
          const supervisor = supervisors.find((s) => s.userId === id);
          if (supervisor) {
            panelSupervisors.push({
              supervisorId: id,
              role: index === 0 ? "chair" : "member",
              name: supervisor.name,
              reason: index === 0 ? "Panel head" : "Panel member",
            });
          }
        });
      }

      // Validate and add panel
      if (panelSupervisors.length > 0) {
        panels.push({
          name: name.length > 100 ? name.substring(0, 100) : name,
          description:
            description.length > 500
              ? description.substring(0, 500)
              : description,
          minSupervisors,
          maxSupervisors,
          supervisors: panelSupervisors,
          groups: assignedGroupIds,
          rationale:
            rationale.length > 1000 ? rationale.substring(0, 1000) : rationale,
        });
      }
    }

    // Fallback: If parsing failed, create balanced panels manually
    if (panels.length === 0) {
      return createFallbackPanels(supervisors, groups);
    }

    // Validate and fix panels
    return validateAndFixPanels(panels, supervisors, groups);
  } catch (error) {
    console.error("Error parsing AI response:", error);
    // Return fallback panels
    return createFallbackPanels(supervisors, groups);
  }
}

function createFallbackPanels(
  supervisors: SupervisorData[],
  groups: GroupData[],
): PanelSuggestion[] {
  const panels: PanelSuggestion[] = [];

  // Calculate optimal panel count based on supervisors and groups
  const totalSupervisors = supervisors.length;
  const totalGroups = groups.length;

  let panelCount: number;
  if (totalSupervisors <= 4) {
    panelCount = 1;
  } else if (totalSupervisors <= 8) {
    panelCount = 2;
  } else if (totalSupervisors <= 15) {
    panelCount = 3;
  } else if (totalSupervisors <= 24) {
    panelCount = 4;
  } else {
    panelCount = Math.ceil(totalSupervisors / 6);
  }

  const supervisorsPerPanel = Math.ceil(totalSupervisors / panelCount);

  // Sort supervisors by workload (groups assigned) for balanced distribution
  const sortedSupervisors = [...supervisors].sort(
    (a, b) => b.assignedGroupIds.length - a.assignedGroupIds.length,
  );

  // Distribute supervisors across panels in round-robin to balance workload
  const panelSupervisors: SupervisorData[][] = Array.from(
    { length: panelCount },
    () => [],
  );

  sortedSupervisors.forEach((supervisor, index) => {
    const panelIndex = index % panelCount;
    panelSupervisors[panelIndex].push(supervisor);
  });

  // Create panels
  for (let i = 0; i < panelCount; i++) {
    const supervisorsInPanel = panelSupervisors[i];

    if (supervisorsInPanel.length === 0) continue;

    // Collect all groups for this panel's supervisors
    const panelGroupIds = supervisorsInPanel.flatMap((s) => s.assignedGroupIds);

    // Select chair (most experienced)
    const chair = supervisorsInPanel.reduce((prev, curr) =>
      curr.currentGroups > prev.currentGroups ? curr : prev,
    );

    panels.push({
      name: `Evaluation Panel ${String.fromCharCode(65 + i)}`,
      description: `FYP Evaluation Panel with ${supervisorsInPanel.length} supervisors evaluating ${panelGroupIds.length} groups`,
      minSupervisors: Math.max(2, supervisorsInPanel.length - 1),
      maxSupervisors: supervisorsInPanel.length + 2,
      supervisors: supervisorsInPanel.map((s) => ({
        supervisorId: s.userId,
        role: s.userId === chair.userId ? "chair" : "member",
        name: s.name,
        reason:
          s.userId === chair.userId
            ? `Most experienced with ${s.currentGroups} groups`
            : `Supervising ${s.assignedGroupIds.length} groups in this panel`,
      })),
      groups: panelGroupIds,
      rationale: `Balanced panel with ${panelGroupIds.length} groups distributed among ${supervisorsInPanel.length} supervisors. Workload per supervisor: ~${(panelGroupIds.length / supervisorsInPanel.length).toFixed(1)} groups.`,
    });
  }

  return panels;
}

function validateAndFixPanels(
  panels: PanelSuggestion[],
  supervisors: SupervisorData[],
  groups: GroupData[],
): PanelSuggestion[] {
  const usedSupervisorIds = new Set<number>();
  const usedGroupIds = new Set<number>();
  const validPanels: PanelSuggestion[] = [];

  // First pass: validate and collect used IDs
  for (const panel of panels) {
    const validSupervisors = panel.supervisors.filter((s) => {
      const supervisor = supervisors.find(
        (sup) => sup.userId === s.supervisorId,
      );
      return supervisor && !usedSupervisorIds.has(s.supervisorId);
    });

    if (validSupervisors.length === 0) continue;

    // Mark supervisors as used
    validSupervisors.forEach((s) => usedSupervisorIds.add(s.supervisorId));

    // Ensure groups match supervisors
    const supervisorIds = validSupervisors.map((s) => s.supervisorId);
    const validGroups = groups
      .filter(
        (g) =>
          supervisorIds.includes(g.supervisorId || 0) &&
          !usedGroupIds.has(g.groupId),
      )
      .map((g) => g.groupId);

    validGroups.forEach((gId) => usedGroupIds.add(gId));

    // Ensure there's a chair
    const hasChair = validSupervisors.some((s) => s.role === "chair");
    if (!hasChair && validSupervisors.length > 0) {
      validSupervisors[0].role = "chair";
    }

    validPanels.push({
      ...panel,
      supervisors: validSupervisors,
      groups: validGroups,
      minSupervisors: Math.max(2, validSupervisors.length - 1),
      maxSupervisors: validSupervisors.length + 1,
    });
  }

  // Second pass: assign remaining supervisors and groups
  const remainingSupervisors = supervisors.filter(
    (s) => !usedSupervisorIds.has(s.userId),
  );
  const remainingGroups = groups.filter((g) => !usedGroupIds.has(g.groupId));

  if (remainingSupervisors.length > 0 && validPanels.length > 0) {
    // Distribute remaining supervisors to smallest panels
    const sortedPanels = [...validPanels].sort(
      (a, b) => a.supervisors.length - b.supervisors.length,
    );

    remainingSupervisors.forEach((supervisor, idx) => {
      const targetPanel = sortedPanels[idx % sortedPanels.length];
      targetPanel.supervisors.push({
        supervisorId: supervisor.userId,
        role: "member",
        name: supervisor.name,
        reason: `Added for balance`,
      });

      // Add supervisor's groups
      const supervisorGroups = groups
        .filter(
          (g) =>
            g.supervisorId === supervisor.userId &&
            !usedGroupIds.has(g.groupId),
        )
        .map((g) => g.groupId);

      targetPanel.groups.push(...supervisorGroups);
      supervisorGroups.forEach((gId) => usedGroupIds.add(gId));
    });
  }

  return validPanels.length > 0
    ? validPanels
    : createFallbackPanels(supervisors, groups);
}
