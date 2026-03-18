export interface User {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'teacher' | 'student';
  classroom_id: number | null;
  grupo_homogeneo: string | null;
}

export interface Classroom {
  id: number;
  name: string;
  description: string | null;
  teacher_id: number | null;
  teacher_name: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  is_active: boolean;
  students_count?: number;
}

export interface StudySession {
  id: number;
  title: string;
  session_date: string;
  status: 'draft' | 'open' | 'closed';
  status_label: string;
  classroom_name: string;
  classroom_id: number;
  teacher_id: number | null;
  teacher_name: string | null;
  session_date_iso: string;
  lesson_type: string | null;
  attendances_count?: number;
  check_in_code: string | null;
  check_in_code_expires_at: string | null;
}

export interface AttendanceRecord {
  id: number;
  session_title: string;
  session_date: string;
  classroom_name: string;
  method: 'manual' | 'qr' | 'auto';
  method_label: string;
  checked_in_at: string;
}

export interface PaginatedData<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
  links: Array<{ url: string | null; label: string; active: boolean }>;
}

export interface PageProps {
  auth: {
    user: User | null;
  };
  flash?: {
    success?: string;
    error?: string;
    info?: string;
  };
  errors?: Record<string, string>;
  [key: string]: unknown;
}

// Page-specific prop types
export interface EntrarPageProps extends PageProps {}

export interface AcessoSessaoPageProps extends PageProps {
  session: {
    id: number;
    title: string;
    session_date: string;
    status: string;
    status_label: string;
    classroom: { name: string };
    check_in_code: string | null;
    check_in_code_expires_at: string | null;
  };
  auth_phone: string | null;
  auth_name: string | null;
}

export interface RegistarPageProps extends PageProps {
  studySession: { id: number; title: string; session_date: string; classroom_id?: number } | null;
  prefillPhone: string;
  classrooms: Array<{ id: number; name: string; teacher_name: string | null }>;
  gruposOptions: Array<{ value: string; label: string }>;
}

export interface MeuPerfilPageProps extends PageProps {
  student: {
    id: number;
    name: string;
    phone: string | null;
    classroom_name: string | null;
    grupo_homogeneo: string | null;
    readiness: string;
    readiness_label: string;
  };
  stats: { attended: number; total: number; rate: number };
  lastAttendances: AttendanceRecord[];
  upcomingSessions: Array<{
    id: number;
    title: string;
    session_date: string;
    classroom_name: string;
    check_in_url: string;
  }>;
}

export interface MinhasPresencasPageProps extends PageProps {
  attendances: PaginatedData<AttendanceRecord>;
  stats: { attended: number; total: number; rate: number; streak: number };
}

export interface EditarPerfilPageProps extends PageProps {
  student: {
    id: number;
    name: string;
    phone: string | null;
    whatsapp: string | null;
    alt_contact: string | null;
    grupo_homogeneo: string | null;
    classroom_name: string | null;
  };
  gruposOptions: Array<{ value: string; label: string }>;
}
