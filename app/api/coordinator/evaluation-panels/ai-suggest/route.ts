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
  hasSEExpertise: boolean;
}

interface GroupData {
  groupId: number;
  groupName: string;
  supervisorId: number | null;
  memberCount: number;
  semanticMatches?: string;
  semanticSupervisorIds: number[];
  projectTitle: string;
  projectCategory: string;
  projectText: string;
  domainKey: string;
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
        category: true,
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

        if (!project) return { groupId: g.groupId, matchesText: "", supervisorIds: [] };

        const textToEmbed = [
          project.title,
          project.abstractText || "",
          project.description || "",
        ]
          .filter(Boolean)
          .join(" ");

        if (!textToEmbed.trim()) return { groupId: g.groupId, matchesText: "", supervisorIds: [] };

        try {
          const embedding = await generateEmbedding(textToEmbed);
          const matches = await matchSupervisorsForProject(embedding, 3, campusId);

          if (matches.length === 0) return { groupId: g.groupId, matchesText: "", supervisorIds: [] };

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
            supervisorIds: matches.map((match) => match.supervisorId),
          };
        } catch (error) {
          console.error(`Error matching supervisors for group ${g.groupId}:`, error);
          return { groupId: g.groupId, matchesText: "", supervisorIds: [] };
        }
      })
    );

    // Transform data for AI processing
    const supervisorData: SupervisorData[] = supervisors.map((s) => {
      const assignedGroupIds = groups
        .filter((g) => g.supervisorId === s.userId)
        .map((g) => g.groupId);

      const hasSEExpertise = supervisorHasSEExpertise({
        specialization: s.supervisor?.specialization || "",
        domains: s.supervisor?.domains || "",
        skills: s.supervisor?.skills || "",
        description: s.supervisor?.description || "",
      });

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
        hasSEExpertise,
      };
    });

    const groupData: GroupData[] = groups.map((g) => {
      const matchObj = groupSemanticMatches.find((m) => m.groupId === g.groupId);
      const project =
        projects.find((p) => p.groupId === g.groupId) ||
        (g.projectId ? projects.find((p) => p.projectId === g.projectId) : null);
      const projectText = [
        project?.title || "",
        project?.category || "",
        project?.abstractText || "",
        project?.description || "",
      ]
        .filter(Boolean)
        .join(" ");
      return {
        groupId: g.groupId,
        groupName: g.groupName || `Group ${g.groupId}`,
        supervisorId: g.supervisorId,
        memberCount: g.students.length,
        semanticMatches: matchObj ? matchObj.matchesText : "",
        semanticSupervisorIds: matchObj?.supervisorIds || [],
        projectTitle: project?.title || "",
        projectCategory: project?.category || "",
        projectText,
        domainKey: getDomainKey(projectText),
      };
    });

    if (groupData.length === 0) {
      return NextResponse.json({
        success: true,
        panels: [],
        summary: {
          totalPanels: 0,
          totalSupervisors: supervisorData.length,
          totalGroups: 0,
          averagePanelSize: 0,
          averageGroupsPerPanel: 0,
        },
        message: "No eligible supervised groups with projects were found for panel creation.",
        timestamp: new Date().toISOString(),
      });
    }

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
        averagePanelSize:
          panelSuggestions.length > 0
            ? Math.round(supervisorData.length / panelSuggestions.length)
            : 0,
        averageGroupsPerPanel:
          panelSuggestions.length > 0
            ? Math.round(groupData.length / panelSuggestions.length)
            : 0,
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
      const hasSEExpertise = s.hasSEExpertise || supervisorHasSEExpertise(s);

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
  const avgGroupsPerSupervisor = totalSupervisors > 0 ? totalGroups / totalSupervisors : 0;

  // Dynamic panel count calculation
  let optimalPanelCount: number;
  let optimalSupervisorsPerPanel: number;

  if (totalGroups <= 1) {
    optimalPanelCount = 1;
    optimalSupervisorsPerPanel = Math.max(1, totalSupervisors);
  } else if (totalSupervisors <= 4) {
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

  optimalPanelCount = Math.max(1, Math.min(optimalPanelCount, totalGroups));

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
4. **Dynamic Panel Size**: Create ${optimalPanelCount} panels. Never create more panels than available groups. If there is only one group, create one panel and assign all suitable members to that panel. For 5-8 supervisors, prefer 2 panels with balanced membership, e.g. 8 supervisors means 4 and 4 members.
5. **Expertise Distribution**: Balance technical expertise across panels.
6. **Panel Chair**: Select the most experienced supervisor (based on achievements, workload) as chair for each panel.
7. **Semantic Supervisor-Group Alignment**: Strongly prioritize assigning supervisors to panels evaluating groups where they have high similarity matches (as indicated by the 'Semantic Supervisor Matches' metadata on each group). This aligns evaluation expertise with project content.
8. **Project-Domain Grouping**: Panels are created around group project domains. AI/ML/Data Science groups should be placed together with AI/ML/Data Science supervisors, Security groups with Security supervisors, and so on.

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
- Prefer each supervisor appearing in one panel, but an SE supervisor may be reused when needed to satisfy the SE-member requirement
- Every group is assigned to exactly ONE panel
- Every panel has at least ONE assigned group; do not produce empty panels
- Each group MUST be assigned to the panel that contains its own supervisor
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

function supervisorHasSEExpertise(supervisor: {
  specialization?: string;
  domains?: string;
  skills?: string;
  description?: string;
}): boolean {
  const text = [
    supervisor.specialization,
    supervisor.domains,
    supervisor.skills,
    supervisor.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /\b(software engineering|software|web engineering|requirements engineering|quality assurance|qa|testing|se)\b/.test(text);
}

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  "AI/ML": [
    "ai",
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "computer vision",
    "nlp",
    "data mining",
    "data science",
    "neural",
    "predictive",
  ],
  Security: ["security", "cyber", "cryptography", "forensics", "malware", "privacy", "authentication"],
  "Software Engineering": [
    "software engineering",
    "web",
    "mobile",
    "app",
    "requirements",
    "testing",
    "quality assurance",
    "devops",
    "saas",
  ],
  "Networks/Cloud": ["network", "cloud", "distributed", "iot", "edge", "serverless"],
  "Embedded/Hardware": ["embedded", "hardware", "robotics", "sensor", "microcontroller", "arduino"],
};

function getDomainKey(text: string): string {
  const normalized = text.toLowerCase();
  let bestDomain = "General";
  let bestScore = 0;

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    const score = keywords.reduce(
      (total, keyword) => total + (normalized.includes(keyword) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  return bestDomain;
}

function supervisorProjectScore(supervisor: SupervisorData, group: GroupData): number {
  const supervisorText = [
    supervisor.specialization,
    supervisor.domains,
    supervisor.skills,
    supervisor.description,
  ]
    .join(" ")
    .toLowerCase();
  const groupText = group.projectText.toLowerCase();
  const domainKeywords = DOMAIN_KEYWORDS[group.domainKey] || [];

  let score = 0;
  if (group.semanticSupervisorIds.includes(supervisor.userId)) score += 8;
  if (group.supervisorId === supervisor.userId) score += 5;
  for (const keyword of domainKeywords) {
    if (supervisorText.includes(keyword)) score += 2;
    if (groupText.includes(keyword)) score += 1;
  }
  if (group.domainKey === "Software Engineering" && supervisor.hasSEExpertise) score += 3;

  return score;
}

function sortSupervisorsForGroup(
  group: GroupData,
  supervisors: SupervisorData[],
): SupervisorData[] {
  return [...supervisors].sort(
    (a, b) => supervisorProjectScore(b, group) - supervisorProjectScore(a, group),
  );
}

function createPanelTitle(groupsInPanel: GroupData[], fallback: string): string {
  const domains = Array.from(new Set(groupsInPanel.map((group) => group.domainKey))).filter(
    (domain) => domain !== "General",
  );
  if (domains.length > 0) {
    return `${domains.slice(0, 2).join(" & ")} Evaluation Panel`;
  }
  return fallback;
}

function normalizePanelMembers(
  panel: PanelSuggestion,
  supervisors: SupervisorData[],
  groups: GroupData[],
): PanelSuggestion {
  const groupsInPanel = groups.filter((group) => panel.groups.includes(group.groupId));
  const memberMap = new Map<number, PanelSuggestion["supervisors"][number]>();

  for (const member of panel.supervisors) {
    const supervisor = supervisors.find((s) => s.userId === member.supervisorId);
    if (!supervisor || memberMap.has(member.supervisorId)) continue;
    memberMap.set(member.supervisorId, {
      supervisorId: member.supervisorId,
      role: member.role,
      name: supervisor.name,
      reason: member.reason || "Selected for panel balance",
    });
  }

  for (const group of groupsInPanel) {
    if (group.supervisorId && !memberMap.has(group.supervisorId)) {
      const supervisor = supervisors.find((s) => s.userId === group.supervisorId);
      if (supervisor) {
        memberMap.set(supervisor.userId, {
          supervisorId: supervisor.userId,
          role: "member",
          name: supervisor.name,
          reason: `Own supervisor for ${group.groupName}`,
        });
      }
    }

    for (const supervisor of sortSupervisorsForGroup(group, supervisors).slice(0, 2)) {
      if (!memberMap.has(supervisor.userId) && supervisorProjectScore(supervisor, group) > 0) {
        memberMap.set(supervisor.userId, {
          supervisorId: supervisor.userId,
          role: "member",
          name: supervisor.name,
          reason: `Semantic/project-domain match for ${group.groupName}`,
        });
      }
    }
  }

  const hasSEMember = Array.from(memberMap.keys()).some((id) => {
    const supervisor = supervisors.find((s) => s.userId === id);
    return supervisor?.hasSEExpertise;
  });

  if (!hasSEMember) {
    const seSupervisor = supervisors
      .filter((supervisor) => supervisor.hasSEExpertise)
      .sort((a, b) => {
        const aScore = groupsInPanel.reduce((sum, group) => sum + supervisorProjectScore(a, group), 0);
        const bScore = groupsInPanel.reduce((sum, group) => sum + supervisorProjectScore(b, group), 0);
        return bScore - aScore;
      })[0];

    if (seSupervisor) {
      memberMap.set(seSupervisor.userId, {
        supervisorId: seSupervisor.userId,
        role: "member",
        name: seSupervisor.name,
        reason: "Required Software Engineering member",
      });
    }
  }

  const members = Array.from(memberMap.values());
  const chairId =
    members.find((member) => member.role === "chair")?.supervisorId ||
    members
      .map((member) => supervisors.find((s) => s.userId === member.supervisorId))
      .filter((supervisor): supervisor is SupervisorData => Boolean(supervisor))
      .sort((a, b) => b.currentGroups - a.currentGroups)[0]?.userId ||
    members[0]?.supervisorId;

  const normalizedMembers = members.map((member) => ({
    ...member,
    role: member.supervisorId === chairId ? ("chair" as const) : ("member" as const),
  }));

  const title = createPanelTitle(groupsInPanel, panel.name);

  return {
    ...panel,
    name: title.length > 100 ? title.substring(0, 100) : title,
    description:
      groupsInPanel.length > 0
        ? `Evaluation panel for ${Array.from(new Set(groupsInPanel.map((group) => group.domainKey))).join(", ")} projects.`
        : panel.description,
    supervisors: normalizedMembers,
    groups: groupsInPanel.map((group) => group.groupId),
    minSupervisors: Math.max(1, Math.min(2, normalizedMembers.length)),
    maxSupervisors: Math.max(normalizedMembers.length, normalizedMembers.length + 1),
    rationale: `${panel.rationale} Every panel has assigned group projects, Pinecone supervisor matches were considered, and an SE member is included where available.`.substring(0, 1000),
  };
}

function scorePanelForGroup(panel: PanelSuggestion, group: GroupData, groups: GroupData[]): number {
  const groupsInPanel = groups.filter((g) => panel.groups.includes(g.groupId));
  const sameDomainCount = groupsInPanel.filter((g) => g.domainKey === group.domainKey).length;
  const semanticMemberCount = panel.supervisors.filter((member) =>
    group.semanticSupervisorIds.includes(member.supervisorId),
  ).length;
  const ownSupervisorPresent = panel.supervisors.some(
    (member) => member.supervisorId === group.supervisorId,
  );

  return sameDomainCount * 6 + semanticMemberCount * 5 + (ownSupervisorPresent ? 4 : 0) - groupsInPanel.length;
}

function calculatePanelCount(totalSupervisors: number, totalGroups: number): number {
  if (totalGroups <= 0 || totalSupervisors <= 0) return 0;
  if (totalGroups <= 1 || totalSupervisors <= 4) return 1;
  if (totalSupervisors <= 8) return 2;
  if (totalSupervisors <= 15) return 3;
  if (totalSupervisors <= 24) return 4;
  return Math.ceil(totalSupervisors / 6);
}

function getSupervisorDomains(supervisor: SupervisorData, groups: GroupData[]): string[] {
  return Array.from(
    new Set(
      groups
        .filter((group) => group.supervisorId === supervisor.userId)
        .map((group) => group.domainKey),
    ),
  );
}

function scoreSupervisorForPanel(
  supervisor: SupervisorData,
  panelSupervisors: SupervisorData[],
  panelGroups: GroupData[],
  groups: GroupData[],
): number {
  const supervisorDomains = getSupervisorDomains(supervisor, groups);
  const panelDomains = new Set(panelGroups.map((group) => group.domainKey));
  const domainScore = supervisorDomains.reduce(
    (score, domain) => score + (panelDomains.has(domain) ? 4 : 0),
    0,
  );
  const semanticScore = panelGroups.reduce(
    (score, group) => score + (group.semanticSupervisorIds.includes(supervisor.userId) ? 3 : 0),
    0,
  );
  const seScore =
    supervisor.hasSEExpertise &&
    !panelSupervisors.some((panelSupervisor) => panelSupervisor.hasSEExpertise)
      ? 2
      : 0;

  return domainScore + semanticScore + seScore;
}

function buildBalancedSupervisorPanels(
  supervisors: SupervisorData[],
  groups: GroupData[],
): SupervisorData[][] {
  const panelCount = Math.max(
    1,
    Math.min(calculatePanelCount(supervisors.length, groups.length), groups.length),
  );
  const targetPanelSize = Math.ceil(supervisors.length / panelCount);
  const panels: SupervisorData[][] = Array.from({ length: panelCount }, () => []);
  const panelLoads = Array.from({ length: panelCount }, () => 0);

  const sortedSupervisors = [...supervisors].sort((a, b) => {
    const groupDiff = b.assignedGroupIds.length - a.assignedGroupIds.length;
    if (groupDiff !== 0) return groupDiff;
    return a.userId - b.userId;
  });

  for (const supervisor of sortedSupervisors) {
    const candidatePanels = panels
      .map((panel, index) => ({ panel, index }))
      .filter(({ panel }) => panel.length < targetPanelSize);
    const availablePanels = candidatePanels.length > 0
      ? candidatePanels
      : panels.map((panel, index) => ({ panel, index }));

    const ownGroups = groups.filter((group) => group.supervisorId === supervisor.userId);
    const bestPanel = availablePanels.sort((a, b) => {
      const aScore = scoreSupervisorForPanel(supervisor, a.panel, groupsForPanel(a.panel, groups), groups);
      const bScore = scoreSupervisorForPanel(supervisor, b.panel, groupsForPanel(b.panel, groups), groups);
      if (aScore !== bScore) return bScore - aScore;
      if (panelLoads[a.index] !== panelLoads[b.index]) return panelLoads[a.index] - panelLoads[b.index];
      return a.panel.length - b.panel.length;
    })[0];

    bestPanel.panel.push(supervisor);
    panelLoads[bestPanel.index] += ownGroups.length;
  }

  return panels.filter((panel) => panel.length > 0);
}

function groupsForPanel(panelSupervisors: SupervisorData[], groups: GroupData[]): GroupData[] {
  const supervisorIds = new Set(panelSupervisors.map((supervisor) => supervisor.userId));
  return groups.filter((group) => group.supervisorId && supervisorIds.has(group.supervisorId));
}

function ensurePanelHasSEMember(
  panelSupervisors: SupervisorData[],
  allSupervisors: SupervisorData[],
  groupsInPanel: GroupData[],
): SupervisorData[] {
  if (panelSupervisors.some((supervisor) => supervisor.hasSEExpertise)) {
    return panelSupervisors;
  }

  const seSupervisor = allSupervisors
    .filter((supervisor) => supervisor.hasSEExpertise)
    .sort((a, b) => {
      const aScore = groupsInPanel.reduce((sum, group) => sum + supervisorProjectScore(a, group), 0);
      const bScore = groupsInPanel.reduce((sum, group) => sum + supervisorProjectScore(b, group), 0);
      return bScore - aScore;
    })[0];

  return seSupervisor && !panelSupervisors.some((supervisor) => supervisor.userId === seSupervisor.userId)
    ? [...panelSupervisors, seSupervisor]
    : panelSupervisors;
}

function createFallbackPanels(
  supervisors: SupervisorData[],
  groups: GroupData[],
): PanelSuggestion[] {
  if (groups.length === 0) return [];

  const panels: PanelSuggestion[] = [];

  const supervisorPanels = buildBalancedSupervisorPanels(supervisors, groups);

  // Create panels
  for (let i = 0; i < supervisorPanels.length; i++) {
    let supervisorsInPanel = supervisorPanels[i];
    const groupsInPanel = groupsForPanel(supervisorsInPanel, groups);

    if (groupsInPanel.length === 0) continue;

    const panelGroupIds = groupsInPanel.map((group) => group.groupId);
    supervisorsInPanel = ensurePanelHasSEMember(supervisorsInPanel, supervisors, groupsInPanel);

    const chair = supervisorsInPanel.reduce(
      (prev, curr) => (curr.currentGroups > prev.currentGroups ? curr : prev),
      supervisorsInPanel[0],
    );

    const panel = normalizePanelMembers({
      name: createPanelTitle(groupsInPanel, `Evaluation Panel ${String.fromCharCode(65 + i)}`),
      description: `FYP Evaluation Panel for ${groupsInPanel.map((group) => group.domainKey).join(", ")} projects`,
      minSupervisors: Math.max(1, Math.min(2, supervisorsInPanel.length)),
      maxSupervisors: supervisorsInPanel.length + 1,
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
      rationale: `Created around ${groupsInPanel.map((group) => group.domainKey).join(", ")} group projects with Pinecone semantic supervisor matches.`,
    }, supervisors, groups);

    panels.push(panel);
  }

  return panels;
}

function validateAndFixPanels(
  panels: PanelSuggestion[],
  supervisors: SupervisorData[],
  groups: GroupData[],
): PanelSuggestion[] {
  if (groups.length === 0) return [];

  const usedGroupIds = new Set<number>();
  const validPanels: PanelSuggestion[] = [];

  // First pass: keep valid panels, but require at least one real group.
  for (const panel of panels) {
    const seenSupervisorIds = new Set<number>();
    const validSupervisors = panel.supervisors.filter((s) => {
      const supervisor = supervisors.find((sup) => sup.userId === s.supervisorId);
      if (!supervisor || seenSupervisorIds.has(s.supervisorId)) return false;
      seenSupervisorIds.add(s.supervisorId);
      return true;
    });

    if (validSupervisors.length === 0) continue;

    const explicitGroupIds = panel.groups.filter((groupId) => {
      const group = groups.find((g) => g.groupId === groupId);
      return group && !usedGroupIds.has(groupId);
    });

    const supervisorIds = validSupervisors.map((s) => s.supervisorId);
    const supervisorGroupIds = groups
      .filter((g) => supervisorIds.includes(g.supervisorId || 0) && !usedGroupIds.has(g.groupId))
      .map((g) => g.groupId);
    const semanticGroupIds = groups
      .filter(
        (g) =>
          g.semanticSupervisorIds.some((id) => supervisorIds.includes(id)) &&
          !usedGroupIds.has(g.groupId),
      )
      .map((g) => g.groupId);

    const validGroups = Array.from(
      new Set(
        explicitGroupIds.length > 0
          ? explicitGroupIds
          : [...supervisorGroupIds, ...semanticGroupIds],
      ),
    );

    if (validGroups.length === 0) continue;

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
      minSupervisors: Math.max(1, Math.min(2, validSupervisors.length)),
      maxSupervisors: validSupervisors.length + 1,
    });
  }

  if (validPanels.length === 0) {
    return createFallbackPanels(supervisors, groups);
  }

  // Second pass: assign every remaining group to the best project-domain panel.
  const remainingGroups = groups.filter((g) => !usedGroupIds.has(g.groupId));

  for (const group of remainingGroups) {
    const targetPanel = [...validPanels].sort(
      (a, b) => scorePanelForGroup(b, group, groups) - scorePanelForGroup(a, group, groups),
    )[0];
    targetPanel.groups.push(group.groupId);
    usedGroupIds.add(group.groupId);
  }

  const repairedPanels = validPanels
    .map((panel) => normalizePanelMembers(panel, supervisors, groups))
    .filter((panel) => panel.groups.length > 0);

  return repairedPanels.length > 0 ? repairedPanels : createFallbackPanels(supervisors, groups);
}
