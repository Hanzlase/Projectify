import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({
  token: process.env.cohere_api_key || '',
});

// Centralized Cohere model configuration
const COHERE_MODEL = process.env.COHERE_MODEL || 'command-r-03-2025';

// POST - Get AI suggestions for panel creation
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'coordinator') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { query, context } = body; // context includes supervisors, groups, existing panels

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    // Get coordinator's campus
    const coordinator = await prisma.fYPCoordinator.findUnique({
      where: { userId },
      select: { campusId: true }
    });

    if (!coordinator) {
      return NextResponse.json({ error: 'Coordinator not found' }, { status: 404 });
    }

    const { campusId } = coordinator;

    // Gather comprehensive context if not provided
    let contextData = context;
    
    if (!contextData) {
      // Get supervisors with workload
      const supervisors = await prisma.user.findMany({
        where: {
          role: 'supervisor',
          supervisor: { campusId }
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
              skills: true
            }
          }
        }
      });

      // Get groups with supervisor assignments
      const groups = await prisma.group.findMany({
        where: {
          students: {
            some: {
              campusId,
              groupId: { not: null }
            }
          },
          isFull: true,
          projectId: { not: null }
        },
        select: {
          groupId: true,
          groupName: true,
          supervisorId: true,
          students: {
            select: {
              userId: true,
              user: { select: { name: true } }
            }
          }
        }
      });

      // Get existing panels
      const existingPanels = await prisma.evaluationPanel.findMany({
        where: { campusId },
        include: {
          panelMembers: {
            select: {
              supervisorId: true
            }
          },
          groupAssignments: {
            select: {
              groupId: true
            }
          }
        }
      });

      contextData = {
        totalSupervisors: supervisors.length,
        totalGroups: groups.length,
        totalExistingPanels: existingPanels.length,
        supervisors: supervisors.map(s => ({
          userId: s.userId,
          name: s.name,
          specialization: s.supervisor?.specialization || 'Not specified',
          maxGroups: s.supervisor?.maxGroups || 0,
          currentGroups: s.supervisor?.totalGroups || 0,
          workloadPercentage: s.supervisor?.maxGroups 
            ? Math.round((s.supervisor.totalGroups || 0) / s.supervisor.maxGroups * 100)
            : 0,
          domains: s.supervisor?.domains,
          skills: s.supervisor?.skills
        })),
        groups: groups.map(g => ({
          groupId: g.groupId,
          groupName: g.groupName || `Group ${g.groupId}`,
          supervisorId: g.supervisorId,
          memberCount: g.students.length
        })),
        existingPanels: existingPanels.map(p => ({
          name: p.name,
          memberCount: p.panelMembers.length,
          groupCount: p.groupAssignments.length
        }))
      };
    }

    // Build comprehensive prompt for Cohere
    const prompt = `You are an expert educational coordinator assistant helping to organize evaluation panels for Final Year Projects (FYP).

CURRENT SITUATION:
- Total Supervisors: ${contextData.totalSupervisors}
- Total FYP Groups in Progress: ${contextData.totalGroups}
- Existing Panels: ${contextData.totalExistingPanels}

SUPERVISOR DETAILS:
${contextData.supervisors.map((s: any) => 
  `- ${s.name}: ${s.specialization} | Current Load: ${s.currentGroups}/${s.maxGroups} groups (${s.workloadPercentage}%)`
).join('\n')}

IMPORTANT CONSTRAINTS:
1. Each panel should have 3-5 supervisors ideally
2. A group's own supervisor MUST be included in their evaluation panel
3. Distribute workload evenly - avoid overloading supervisors who already have many groups
4. Consider specialization diversity in panels for fair evaluation
5. Balance panel sizes to prevent any single panel from being overwhelmed

COORDINATOR'S QUERY:
${query}

Please provide specific, actionable recommendations considering workload distribution and the constraint that group supervisors must be on their evaluation panels. Format your response clearly with:
1. Specific panel compositions (which supervisors)
2. Recommended group assignments per panel
3. Reasoning for each recommendation
4. Potential concerns or alternatives`;

    // Call Cohere API
    const response = await cohere.chat({
      model: COHERE_MODEL,
      message: prompt,
      temperature: 0.7,
      maxTokens: 2000,
      preamble: "You are a helpful assistant specialized in educational administration and fair workload distribution."
    });

    const suggestion = response.text;

    // Parse and structure the response
    return NextResponse.json({
      success: true,
      suggestion,
      contextUsed: {
        supervisorCount: contextData.totalSupervisors,
        groupCount: contextData.totalGroups,
        panelCount: contextData.totalExistingPanels
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting AI suggestions:', error);
    return NextResponse.json({ 
      error: 'Failed to get AI suggestions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
