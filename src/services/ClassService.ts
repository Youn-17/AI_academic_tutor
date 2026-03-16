import { supabase } from '@/lib/supabase';

export interface Class {
    id: string;
    name: string;
    teacher_id: string;
    created_at: string;
    member_count?: number; // Optional count
}

export interface ClassMember {
    id: string;
    class_id: string;
    student_id: string;
    joined_at: string;
    student_name?: string; // Joined field
    student_avatar?: string;
}

// Supervisor: Create a new class
export async function createClass(name: string): Promise<Class | null> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('classes')
        .insert([{ name, teacher_id: user.id }])
        .select()
        .single();

    if (error) {
        console.error('Error creating class:', error);
        throw error;
    }
    return data;
}

// Supervisor: Update class name
export async function updateClass(classId: string, name: string): Promise<void> {
    const { error } = await supabase
        .from('classes')
        .update({ name })
        .eq('id', classId);

    if (error) {
        console.error('Error updating class:', error);
        throw error;
    }
}

// Supervisor: Delete a class
export async function deleteClass(classId: string): Promise<void> {
    const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

    if (error) {
        console.error('Error deleting class:', error);
        throw error;
    }
}

// Supervisor: Get all classes they teach
export async function getTeacherClasses(): Promise<Class[]> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return [];

    const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

// Student: Get all available classes to join (could filter by search)
export async function getAllClasses(): Promise<Class[]> {
    const { data, error } = await supabase
        .from('classes')
        .select('*, profiles:teacher_id(full_name)') // Join with profile to get teacher name if possible
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

// Student: Join a class
export async function joinClass(classId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('Not authenticated');

    // Check if already joined
    const { data: existing } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', classId)
        .eq('student_id', user.id)
        .single();

    if (existing) return; // Already joined

    const { error } = await supabase
        .from('class_members')
        .insert([{ class_id: classId, student_id: user.id }]);

    if (error) throw error;
}

// Shared: Get detailed info about a class, including members
export async function getClassMembers(classId: string): Promise<ClassMember[]> {
    const { data, error } = await supabase
        .from('class_members')
        .select('*, profiles:student_id(full_name, nickname, avatar_url, email)')
        .eq('class_id', classId);

    if (error) throw error;

    // Transform to flat structure
    return (data || []).map((item: any) => ({
        id: item.id,
        class_id: item.class_id,
        student_id: item.student_id,
        joined_at: item.created_at || new Date().toISOString(),
        student_name: item.profiles?.nickname || item.profiles?.full_name || item.profiles?.email || 'Unknown',
        student_avatar: item.profiles?.avatar_url
    }));
}

// Supervisor: Get all students in all my classes
export async function getMyStudents(): Promise<string[]> {
    const classes = await getTeacherClasses();
    if (classes.length === 0) return [];

    const classIds = classes.map(c => c.id);

    const { data, error } = await supabase
        .from('class_members')
        .select('student_id')
        .in('class_id', classIds);

    if (error) throw error;

    // Return unique student IDs
    return Array.from(new Set((data || []).map((d: any) => d.student_id)));
}

// Student: Get my joined classes
export async function getMyClasses(): Promise<Class[]> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return [];

    const { data, error } = await supabase
        .from('class_members')
        .select('class_id, classes:class_id(*)')
        .eq('student_id', user.id);

    if (error) throw error;

    // Extract class objects
    return (data || []).map((d: any) => d.classes).filter((c: any) => c !== null);
}
