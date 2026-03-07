import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { emitGroupUpdated, emitNotificationToUser } from '@/lib/socket-emitters';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userId = parseInt(session.user.id);
    const role = session.user.role;
    let groups: any[] = [];
    if (role === 'student') {
      const student = await (prisma.student.findUnique as any)({
        where: { userId },
        include: {
          group: {
            include: {
              students: {
                select: {
                  studentId: true, userId: true, rollNumber: true, isGroupAdmin: true,
                  user: { select: { userId: true, name: true, email: true, profileImage: true, role: true } }
                }
              },
              groupChats: true,
              groupInvitations: { where: { status: 'pending' } }
            }
          }
        }
      });
      if (student?.group) {
        let supervisor = null;
        if (student.group.supervisorId) {
          supervisor = await prisma.user.findUnique({
            where: { userId: student.group.supervisorId },
            select: { userId: true, name: true, email: true, profileImage: true, role: true }
          });
        }
        let project = null;
        if (student.group.projectId) {
          project = await (prisma as any).project.findUnique({
            where: { projectId: student.group.projectId },
            select: { projectId: true, title: true, description: true, status: true }
          });
        }
        groups = [{
          ...student.group, supervisor, project,
          isCreator: student.group.createdById === student.studentId,
          memberCount: student.group.students.length
        }];
      }
      const createdGroup = await (prisma as any).group.findFirst({ where: { createdById: student?.studentId || 0 } });
      const pendingInvitations = await (prisma as any).groupInvitation.findMany({
        where: { inviteeId: userId, status: 'pending' },
        include: { group: { include: { students: { include: { user: { select: { userId: true, name: true, profileImage: true } } } } } } }
      });
      return NextResponse.json({ groups, hasCreatedGroup: !!createdGroup, hasGroup: !!student?.groupId, currentStudentId: student?.studentId, pendingInvitations });
    } else if (role === 'supervisor') {
      const supervisorGroups = await (prisma as any).group.findMany({
        where: { supervisorId: userId },
        include: {
          students: { select: { studentId: true, userId: true, rollNumber: true, isGroupAdmin: true, user: { select: { userId: true, name: true, email: true, profileImage: true, role: true } } } },
          groupChats: true
        }
      });
      groups = await Promise.all(supervisorGroups.map(async (group: any) => {
        let project = null;
        if (group.projectId) {
          project = await (prisma as any).project.findUnique({ where: { projectId: group.projectId }, select: { projectId: true, title: true, description: true, status: true } });
        }
        return { ...group, project, supervisor: { userId, name: session.user.name, email: session.user.email, profileImage: null, role: 'supervisor' }, memberCount: group.students.length };
      }));
      const pendingInvitations = await (prisma as any).groupInvitation.findMany({
        where: { inviteeId: userId, status: 'pending', inviteeRole: 'supervisor' },
        include: { group: { include: { students: { include: { user: { select: { userId: true, name: true, profileImage: true } } } } } } }
      });
      return NextResponse.json({ groups, pendingInvitations });
    }
    return NextResponse.json({ groups: [] });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (session.user.role !== 'student') return NextResponse.json({ error: 'Only students can create groups' }, { status: 403 });
    const userId = parseInt(session.user.id);
    const body = await req.json();
    const { projectId: rawProjectId, studentUserIds, supervisorUserId } = body;
    if (!rawProjectId) return NextResponse.json({ error: 'Please select a project' }, { status: 400 });
    const projectId = typeof rawProjectId === 'string' ? parseInt(rawProjectId) : rawProjectId;
    if (!supervisorUserId) return NextResponse.json({ error: 'Please select a supervisor' }, { status: 400 });
    const supervisorId = typeof supervisorUserId === 'string' ? parseInt(supervisorUserId) : supervisorUserId;
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    if (student.groupId) return NextResponse.json({ error: 'You are already in a group' }, { status: 400 });
    const existingCreatedGroup = await (prisma as any).group.findFirst({ where: { createdById: student.studentId } });
    if (existingCreatedGroup) return NextResponse.json({ error: 'You have already created a group' }, { status: 400 });
    const project = await (prisma as any).project.findUnique({ where: { projectId } });
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (project.status === 'taken') return NextResponse.json({ error: 'This project has already been taken' }, { status: 400 });
    const existingGroupWithProject = await (prisma as any).group.findFirst({ where: { projectId } });
    if (existingGroupWithProject) return NextResponse.json({ error: 'This project is already assigned' }, { status: 400 });
    const invitedStudentIds: number[] = (studentUserIds || []).map((id: any) => typeof id === 'string' ? parseInt(id) : id);
    if (invitedStudentIds.length > 2) return NextResponse.json({ error: 'You can invite maximum 2 other students' }, { status: 400 });
    if (invitedStudentIds.length > 0) {
      const invitedStudents = await prisma.student.findMany({ where: { userId: { in: invitedStudentIds }, groupId: null } });
      if (invitedStudents.length !== invitedStudentIds.length) return NextResponse.json({ error: 'Some selected students are already in a group' }, { status: 400 });
    }
    const supervisor = await prisma.user.findUnique({ where: { userId: supervisorId, role: 'supervisor' } });
    if (!supervisor) return NextResponse.json({ error: 'Supervisor not found' }, { status: 404 });
    const group = await (prisma as any).group.create({ data: { groupName: project.title, projectId, createdById: student.studentId, supervisorId: null, isFull: false } });
    await (prisma as any).student.update({ where: { studentId: student.studentId }, data: { groupId: group.groupId, isGroupAdmin: true } });
    await (prisma as any).project.update({ where: { projectId }, data: { status: 'taken' } });
    const conversation = await (prisma as any).conversation.create({ data: {} });
    await (prisma as any).conversationParticipant.create({ data: { conversationId: conversation.conversationId, userId } });
    await (prisma as any).groupChat.create({ data: { groupId: group.groupId, conversationId: conversation.conversationId } });
    await (prisma as any).message.create({ data: { conversationId: conversation.conversationId, senderId: userId, content: `Group "${project.title}" has been created!` } });
    for (const studentUserId of invitedStudentIds) {
      await (prisma as any).groupInvitation.create({ data: { groupId: group.groupId, inviterId: userId, inviteeId: studentUserId, inviteeRole: 'student', message: `You have been invited to join "${project.title}"` } });
    }
    await (prisma as any).groupInvitation.create({ data: { groupId: group.groupId, inviterId: userId, inviteeId: supervisorId, inviteeRole: 'supervisor', message: `You have been invited to supervise "${project.title}"` } });
    return NextResponse.json({ success: true, group: { ...group, conversationId: conversation.conversationId }, message: 'Group created! Invitations sent.' });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');
    if (!groupId) return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    const group = await (prisma as any).group.findUnique({ where: { groupId: parseInt(groupId) }, include: { students: true, groupChats: true, groupInvitations: true } });
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    const isCreator = group.students.some((s: any) => s.userId === userId && group.createdById === s.studentId);
    const isSupervisor = group.supervisorId === userId;
    const student = await (prisma as any).student.findUnique({ where: { userId } });
    const isStudentAdmin = student?.groupId === parseInt(groupId) && student?.isGroupAdmin;
    if (!isCreator && !isSupervisor && !isStudentAdmin) return NextResponse.json({ error: 'Only group admins can delete' }, { status: 403 });
    const projectId = group.projectId;
    await (prisma as any).student.updateMany({ where: { groupId: parseInt(groupId) }, data: { groupId: null, isGroupAdmin: false } });
    await (prisma as any).groupInvitation.deleteMany({ where: { groupId: parseInt(groupId) } });
    if (group.groupChats.length > 0) {
      const conversationId = group.groupChats[0].conversationId;
      await (prisma as any).message.deleteMany({ where: { conversationId } });
      await (prisma as any).conversationParticipant.deleteMany({ where: { conversationId } });
      await (prisma as any).conversation.delete({ where: { conversationId } });
    }
    await (prisma as any).groupChat.deleteMany({ where: { groupId: parseInt(groupId) } });
    await (prisma as any).group.delete({ where: { groupId: parseInt(groupId) } });
    if (projectId) await (prisma as any).project.update({ where: { projectId }, data: { status: 'idea' } });
    return NextResponse.json({ success: true, message: 'Group deleted successfully.' });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const userId = parseInt(session.user.id);
    const body = await req.json();
    const { groupId, action, targetUserId } = body;
    if (!groupId || !action) return NextResponse.json({ error: 'Group ID and action are required' }, { status: 400 });
    const group = await (prisma as any).group.findUnique({ where: { groupId: parseInt(groupId) }, include: { students: true } });
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    const student = await (prisma as any).student.findUnique({ where: { userId } });
    const isCreator = student && group.createdById === student.studentId;
    const isSupervisor = group.supervisorId === userId;
    const isStudentAdmin = student?.groupId === parseInt(groupId) && student?.isGroupAdmin;
    if (!isCreator && !isSupervisor && !isStudentAdmin) return NextResponse.json({ error: 'Only group admins can perform this action' }, { status: 403 });
    switch (action) {
      case 'makeAdmin': {
        if (!targetUserId) return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
        const targetStudent = await prisma.student.findUnique({ where: { userId: parseInt(targetUserId) } });
        if (!targetStudent || targetStudent.groupId !== parseInt(groupId)) return NextResponse.json({ error: 'User is not a member' }, { status: 400 });
        await (prisma as any).student.update({ where: { studentId: targetStudent.studentId }, data: { isGroupAdmin: true } });
        return NextResponse.json({ success: true, message: 'User is now an admin' });
      }
      case 'removeAdmin': {
        if (!targetUserId) return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
        const targetStudent = await prisma.student.findUnique({ where: { userId: parseInt(targetUserId) } });
        if (!targetStudent || targetStudent.groupId !== parseInt(groupId)) return NextResponse.json({ error: 'User is not a member' }, { status: 400 });
        if (group.createdById === targetStudent.studentId) return NextResponse.json({ error: 'Cannot remove admin from creator' }, { status: 400 });
        await (prisma as any).student.update({ where: { studentId: targetStudent.studentId }, data: { isGroupAdmin: false } });
        return NextResponse.json({ success: true, message: 'Admin role removed' });
      }
      case 'removeMember': {
        if (!targetUserId) return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
        const targetStudent = await prisma.student.findUnique({ where: { userId: parseInt(targetUserId) } });
        if (!targetStudent || targetStudent.groupId !== parseInt(groupId)) return NextResponse.json({ error: 'User is not a member' }, { status: 400 });
        if (group.createdById === targetStudent.studentId) return NextResponse.json({ error: 'Cannot remove creator' }, { status: 400 });
        await (prisma as any).student.update({ where: { studentId: targetStudent.studentId }, data: { groupId: null, isGroupAdmin: false } });
        const groupChat = await (prisma as any).groupChat.findFirst({ where: { groupId: parseInt(groupId) } });
        if (groupChat) {
          await (prisma as any).conversationParticipant.deleteMany({ where: { conversationId: groupChat.conversationId, userId: parseInt(targetUserId) } });
          await (prisma as any).message.create({ data: { conversationId: groupChat.conversationId, senderId: userId, content: 'A member has been removed.' } });
        }
        // Notify all current members + the removed member
        try {
          const allMemberUserIds = group.students.map((s: any) => s.userId);
          emitGroupUpdated(allMemberUserIds, { groupId: parseInt(groupId), event: 'member_left', userId: parseInt(targetUserId) });
        } catch (_) {}
        return NextResponse.json({ success: true, message: 'Member removed' });
      }
      case 'addMember': {
        if (!targetUserId) return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
        if (group.students.length >= 3) return NextResponse.json({ error: 'Group already has maximum 3 students' }, { status: 400 });
        const targetStudent = await prisma.student.findUnique({ where: { userId: parseInt(targetUserId) } });
        if (!targetStudent) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        if (targetStudent.groupId) return NextResponse.json({ error: 'Student is already in a group' }, { status: 400 });
        await (prisma as any).student.update({ where: { studentId: targetStudent.studentId }, data: { groupId: parseInt(groupId) } });
        const groupChat = await (prisma as any).groupChat.findFirst({ where: { groupId: parseInt(groupId) } });
        if (groupChat) {
          await (prisma as any).conversationParticipant.create({ data: { conversationId: groupChat.conversationId, userId: parseInt(targetUserId) } });
          const targetUser = await prisma.user.findUnique({ where: { userId: parseInt(targetUserId) } });
          await (prisma as any).message.create({ data: { conversationId: groupChat.conversationId, senderId: userId, content: `${targetUser?.name || 'A member'} has been added!` } });
        }
        const updatedStudentCount = group.students.length + 1;
        if (updatedStudentCount >= 3 && group.supervisorId) await (prisma as any).group.update({ where: { groupId: parseInt(groupId) }, data: { isFull: true } });
        // Notify all current members (including new member) of the change
        try {
          const allMemberUserIds = group.students.map((s: any) => s.userId);
          allMemberUserIds.push(parseInt(targetUserId));
          if (group.supervisorId) allMemberUserIds.push(group.supervisorId);
          emitGroupUpdated(allMemberUserIds, { groupId: parseInt(groupId), event: 'member_joined', userId: parseInt(targetUserId) });
        } catch (_) {}
        return NextResponse.json({ success: true, message: 'Member added' });
      }
      case 'leaveGroup': {
        if (!student || student.groupId !== parseInt(groupId)) return NextResponse.json({ error: 'You are not a member' }, { status: 400 });
        if (group.createdById === student.studentId) return NextResponse.json({ error: 'Creator cannot leave. Delete the group instead.' }, { status: 400 });
        await (prisma as any).student.update({ where: { studentId: student.studentId }, data: { groupId: null, isGroupAdmin: false } });
        const groupChat = await (prisma as any).groupChat.findFirst({ where: { groupId: parseInt(groupId) } });
        if (groupChat) {
          await (prisma as any).conversationParticipant.deleteMany({ where: { conversationId: groupChat.conversationId, userId } });
          await (prisma as any).message.create({ data: { conversationId: groupChat.conversationId, senderId: userId, content: `${session.user.name || 'A member'} has left.` } });
        }
        await (prisma as any).group.update({ where: { groupId: parseInt(groupId) }, data: { isFull: false } });
        // Notify remaining members that someone left
        try {
          const remainingMemberUserIds = group.students
            .filter((s: any) => s.userId !== userId)
            .map((s: any) => s.userId);
          if (group.supervisorId) remainingMemberUserIds.push(group.supervisorId);
          emitGroupUpdated(remainingMemberUserIds, { groupId: parseInt(groupId), event: 'member_left', userId });
        } catch (_) {}
        return NextResponse.json({ success: true, message: 'You have left the group' });
      }
      default: return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}
