import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({
  token: process.env.cohere_api_key || '',
});

// Centralized Cohere model configuration
const COHERE_MODEL = process.env.COHERE_MODEL || 'command-r-08-2024';

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
              skills: true,
              achievements: true,
              description: true
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
          description: s.supervisor?.description || '',
          domains: s.supervisor?.domains || '',
          skills: s.supervisor?.skills || '',
          achievements: s.supervisor?.achievements || '',
          maxGroups: s.supervisor?.maxGroups || 0,
          currentGroups: s.supervisor?.totalGroups || 0,
          workloadPercentage: s.supervisor?.maxGroups 
            ? Math.round((s.supervisor.totalGroups || 0) / s.supervisor.maxGroups * 100)
            : 0
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

    // Build comprehensive prompt for Cohere with supervisor profiles
    const supervisorProfiles = contextData.supervisors.map((s: any) => {
      const parts = [
        `${s.name}:`,
        `Specialization: ${s.specialization}`,
        `Workload: ${s.currentGroups}/${s.maxGroups} groups (${s.workloadPercentage}%)`
      ];
      
      if (s.domains) parts.push(`Research Domains: ${s.domains}`);
      if (s.skills) parts.push(`Skills: ${s.skills}`);
      if (s.achievements) parts.push(`Achievements: ${s.achievements}`);
      
      return parts.join(' | ');
    }).join('\n');

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
      preamble: "You are a helpful assistant. Provide clear, specific recommendations in 2-3 sentences mentioning supervisor names."
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
