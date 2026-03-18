<?php

namespace App\Http\Controllers\Admin;

use App\Enums\GrupoHomogeneo;
use App\Exceptions\AttendanceException;
use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\StudySession;
use App\Models\User;
use App\Services\AttendanceService;
use App\Support\ExcelExport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudySessionsController extends Controller
{
    public function __construct(private readonly AttendanceService $attendanceService)
    {
    }

    public function index(Request $request): Response
    {
        $query = StudySession::with('classroom', 'teacher')
            ->withCount('attendances');

        $sortable = ['title', 'session_date', 'status', 'attendances_count'];
        $sortBy = in_array($request->input('sort_by'), $sortable) ? $request->input('sort_by') : 'session_date';
        $sortDir = $request->input('sort_dir') === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortDir);

        $perPage = in_array((int) $request->input('per_page'), [25, 50, 100]) ? (int) $request->input('per_page') : 25;

        $sessions = $query->paginate($perPage)->withQueryString()->through(fn ($s) => [
                'id'                      => $s->id,
                'title'                   => $s->title,
                'session_date'            => $s->session_date->format('d/m/Y'),
                'status'                  => $s->status->value,
                'status_label'            => $s->status->label(),
                'classroom_name'          => $s->classroom->name,
                'classroom_id'            => $s->classroom_id,
                'teacher_id'              => $s->teacher_id,
                'teacher_name'            => $s->teacher?->name,
                'session_date_iso'        => $s->session_date->format('Y-m-d'),
                'lesson_type'             => $s->lesson_type,
                'attendances_count'       => $s->attendances_count,
                'check_in_code_expires_at' => $s->check_in_code_expires_at?->toISOString(),
            ]);

        $classrooms = Classroom::where('is_active', true)
            ->with('teachers')
            ->get()
            ->map(fn ($c) => [
                'id'         => $c->id,
                'name'       => $c->name,
                'teacher_ids' => $c->teachers->pluck('id'),
            ]);

        $teachers = User::whereIn('role', ['admin', 'teacher'])
            ->get()
            ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name]);

        return Inertia::render('Admin/Sessoes', [
            'sessions'   => $sessions,
            'classrooms' => $classrooms,
            'teachers'   => $teachers,
            'filters'    => $request->only(['sort_by', 'sort_dir', 'per_page']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'classroom_id' => 'required|exists:classrooms,id',
            'teacher_id'   => 'nullable|exists:users,id',
            'title'        => 'required|string|max:255',
            'session_date' => 'required|date',
            'lesson_type'  => 'nullable|string|max:100',
            'notes'        => 'nullable|string',
        ], [
            'classroom_id.required' => 'A turma é obrigatória.',
            'classroom_id.exists' => 'A turma selecionada não existe.',
            'title.required' => 'O título da aula é obrigatório.',
            'session_date.required' => 'A data da aula é obrigatória.',
            'session_date.date' => 'A data da aula não é válida.',
        ]);

        StudySession::create($validated);
        return back()->with('success', 'Aula criada com sucesso.');
    }

    public function update(Request $request, StudySession $studySession): RedirectResponse
    {
        $validated = $request->validate([
            'teacher_id'   => 'nullable|exists:users,id',
            'title'        => 'required|string|max:255',
            'session_date' => 'required|date',
            'lesson_type'  => 'nullable|string|max:100',
            'notes'        => 'nullable|string',
        ], [
            'title.required' => 'O título da aula é obrigatório.',
            'session_date.required' => 'A data da aula é obrigatória.',
            'session_date.date' => 'A data da aula não é válida.',
        ]);

        $studySession->update($validated);
        return back()->with('success', 'Aula atualizada com sucesso.');
    }

    public function destroy(StudySession $studySession): RedirectResponse
    {
        $studySession->delete();
        return back()->with('success', 'Aula eliminada.');
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $request->validate(['ids' => 'required|array|min:1', 'ids.*' => 'integer|exists:study_sessions,id']);
        StudySession::whereIn('id', $request->ids)->delete();
        return back()->with('success', count($request->ids) . ' aula(s) eliminada(s).');
    }

    public function bulkDestroyAttendances(Request $request): RedirectResponse
    {
        $request->validate(['ids' => 'required|array|min:1', 'ids.*' => 'integer|exists:attendances,id']);
        Attendance::whereIn('id', $request->ids)->delete();
        return back()->with('success', count($request->ids) . ' presença(s) removida(s).');
    }

    public function open(StudySession $studySession): RedirectResponse
    {
        try {
            $this->attendanceService->openSession($studySession);
            return back()->with('success', 'Aula aberta para presenças.');
        } catch (AttendanceException $e) {
            return back()->withErrors(['general' => $e->getMessage()]);
        }
    }

    public function close(StudySession $studySession): RedirectResponse
    {
        try {
            $this->attendanceService->closeSession($studySession);
            return back()->with('success', 'Aula fechada.');
        } catch (AttendanceException $e) {
            return back()->withErrors(['general' => $e->getMessage()]);
        }
    }

    public function regenerateCode(StudySession $studySession): RedirectResponse
    {
        try {
            $this->attendanceService->regenerateCode($studySession);
            return back()->with('success', 'Código QR regenerado.');
        } catch (AttendanceException $e) {
            return back()->withErrors(['general' => $e->getMessage()]);
        }
    }

    public function markPresent(Request $request, StudySession $studySession): RedirectResponse
    {
        $request->validate(['student_id' => 'required|exists:users,id']);

        $student = User::findOrFail($request->student_id);

        try {
            $this->attendanceService->markPresent($studySession, $student, auth()->user());
            return back()->with('success', "Presença de {$student->name} marcada com sucesso.");
        } catch (AttendanceException $e) {
            return back()->withErrors(['mark' => $e->getMessage()]);
        }
    }

    public function attendance(Request $request, StudySession $studySession): Response
    {
        $studySession->load('classroom', 'teacher', 'resources');

        // Students who attended
        $attendedQuery = Attendance::where('study_session_id', $studySession->id)
            ->with(['student', 'markedBy']);

        if ($request->filled('search')) {
            $s = $request->search;
            $attendedQuery->whereHas('student', fn ($q) => $q
                ->where('name', 'like', "%{$s}%")
                ->orWhere('phone', 'like', "%{$s}%")
            );
        }
        if ($request->filled('grupo_homogeneo')) {
            $attendedQuery->whereHas('student', fn ($q) =>
                $q->where('grupo_homogeneo', $request->grupo_homogeneo)
            );
        }

        $sortable = ['name', 'phone', 'check_in_method', 'checked_in_at'];
        $sortBy = $request->input('sort_by');
        $sortDir = $request->input('sort_dir') === 'desc' ? 'desc' : 'asc';

        if ($sortBy === 'name') {
            $attendedQuery->join('users', 'users.id', '=', 'attendances.student_id')
                ->orderBy('users.name', $sortDir)
                ->select('attendances.*');
        } elseif ($sortBy === 'phone') {
            $attendedQuery->join('users', 'users.id', '=', 'attendances.student_id')
                ->orderBy('users.phone', $sortDir)
                ->select('attendances.*');
        } elseif (in_array($sortBy, ['check_in_method', 'checked_in_at'])) {
            $attendedQuery->orderBy($sortBy, $sortDir);
        } else {
            $attendedQuery->join('users', 'users.id', '=', 'attendances.student_id')
                ->orderBy('users.name', 'asc')
                ->select('attendances.*');
        }

        $perPage = in_array((int) $request->input('per_page'), [25, 50, 100]) ? (int) $request->input('per_page') : 25;

        $attended = $attendedQuery->paginate($perPage)->withQueryString()->through(fn ($a) => [
            'id'                    => $a->id,
            'student_id'            => $a->student_id,
            'name'                  => $a->student->name,
            'phone'                 => $a->student->phone,
            'role'                  => $a->student->role->value,
            'grupo_homogeneo'       => $a->student->grupo_homogeneo?->value,
            'grupo_homogeneo_label' => $a->student->grupo_homogeneo?->label(),
            'method'                => $a->check_in_method->value,
            'method_label'          => $a->check_in_method->label(),
            'checked_in_at'         => $a->checked_in_at->format('H:i'),
            'marked_by'             => $a->markedBy?->name,
        ]);

        // All classroom students not yet attending (for manual mark dropdown)
        $attendedIds = Attendance::where('study_session_id', $studySession->id)
            ->pluck('student_id');

        $notAttended = User::where('classroom_id', $studySession->classroom_id)
            ->whereIn('role', ['student', 'teacher'])
            ->whereNotIn('id', $attendedIds)
            ->orderBy('name')
            ->get()
            ->map(fn ($u) => [
                'id'    => $u->id,
                'name'  => $u->name,
                'phone' => $u->phone,
                'role'  => $u->role->value,
            ]);

        $resources = $studySession->resources->map(fn ($r) => [
            'id'                => $r->id,
            'type'              => $r->type,
            'title'             => $r->title,
            'url'               => $r->url,
            'original_filename' => $r->original_filename,
            'download_url'      => $r->type === 'file'
                ? route('admin.resources.download', $r)
                : $r->url,
        ]);

        return Inertia::render('Admin/SessaoPresencas', [
            'studySession' => [
                'id'             => $studySession->id,
                'title'          => $studySession->title,
                'session_date'   => $studySession->session_date->format('d/m/Y'),
                'status'         => $studySession->status->value,
                'status_label'   => $studySession->status->label(),
                'classroom_id'   => $studySession->classroom_id,
                'classroom_name' => $studySession->classroom->name,
                'teacher_name'   => $studySession->teacher?->name,
            ],
            'resources' => $resources,
            'attended'      => $attended,
            'notAttended'   => $notAttended,
            'gruposOptions' => collect(GrupoHomogeneo::cases())
                ->map(fn ($g) => ['value' => $g->value, 'label' => $g->label()]),
            'filters'       => $request->only(['search', 'grupo_homogeneo', 'sort_by', 'sort_dir', 'per_page']),
        ]);
    }

    public function removeAttendance(Attendance $attendance): RedirectResponse
    {
        $sessionId = $attendance->study_session_id;
        $attendance->delete();
        return redirect("/admin/sessoes/{$sessionId}/presencas")->with('success', 'Presença removida.');
    }

    public function registerAndMark(Request $request, StudySession $studySession): RedirectResponse
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:255',
            'phone'            => 'required|string|max:50|unique:users,phone',
            'alt_contact'      => 'nullable|string|max:255',
            'grupo_homogeneo'  => 'required|in:' . implode(',', array_column(GrupoHomogeneo::cases(), 'value')),
        ], [
            'name.required'            => 'O nome é obrigatório.',
            'phone.required'           => 'O número de telefone é obrigatório.',
            'phone.unique'             => 'Este número já está registado. Usa a pesquisa para o encontrar.',
            'grupo_homogeneo.required' => 'O grupo homogéneo é obrigatório.',
        ]);

        $student = User::create([
            'name'            => $validated['name'],
            'phone'           => $validated['phone'],
            'whatsapp'        => $validated['phone'],   // phone = whatsapp
            'alt_contact'     => $validated['alt_contact'] ?? null,
            'grupo_homogeneo' => $validated['grupo_homogeneo'],
            'classroom_id'    => $studySession->classroom_id,
            'role'            => 'student',
            'password'        => null,
        ]);

        try {
            $this->attendanceService->createAttendance(
                $studySession,
                $student,
                auth()->user(),
                \App\Enums\CheckInMethod::Manual,
            );
        } catch (AttendanceException) {
            // Already present — shouldn't happen for a brand-new student, but be safe
        }

        return back()->with('success', "{$student->name} registado e presença marcada.");
    }

    public function exportExcel(StudySession $studySession): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $studySession->load('classroom');

        $attendances = Attendance::where('study_session_id', $studySession->id)
            ->with(['student', 'markedBy'])
            ->join('users', 'users.id', '=', 'attendances.student_id')
            ->orderBy('users.name')
            ->select('attendances.*')
            ->get();

        $filename = 'presencas_' . str($studySession->title)->slug('_') . '_' . $studySession->session_date->format('Y-m-d') . '.xlsx';

        return ExcelExport::download($filename, function ($sheet) use ($studySession, $attendances) {
            // Title
            $sheet->setCellValue('A1', 'Presenças — ' . $studySession->title);
            $sheet->setCellValue('A2', $studySession->classroom->name . ' · ' . $studySession->session_date->format('d/m/Y'));
            $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(13);
            $sheet->getStyle('A2')->getFont()->setSize(10)->getColor()->setARGB('FF64748B');
            $sheet->mergeCells('A1:F1');
            $sheet->mergeCells('A2:F2');

            // Headers
            $headers = ['Nome', 'Telefone', 'Grupo Homogéneo', 'Método', 'Hora', 'Marcado por'];
            foreach ($headers as $i => $h) {
                $sheet->setCellValue([$i + 1, 4], $h);
            }
            ExcelExport::styleHeader($sheet, 'A4:F4');
            $sheet->getRowDimension(4)->setRowHeight(22);

            // Data
            foreach ($attendances as $idx => $a) {
                $row = $idx + 5;
                $sheet->setCellValue([1, $row], $a->student->name);
                $sheet->setCellValue([2, $row], $a->student->phone ?? '');
                $sheet->setCellValue([3, $row], $a->student->grupo_homogeneo?->label() ?? '');
                $sheet->setCellValue([4, $row], $a->check_in_method->label());
                $sheet->setCellValue([5, $row], $a->checked_in_at->format('H:i'));
                $sheet->setCellValue([6, $row], $a->markedBy?->name ?? '—');
                ExcelExport::styleData($sheet, "A{$row}:F{$row}", $idx % 2 === 0);
            }

            // Summary row
            $sumRow = $attendances->count() + 5;
            $sheet->setCellValue("A{$sumRow}", 'Total: ' . $attendances->count() . ' presenças');
            $sheet->getStyle("A{$sumRow}")->getFont()->setBold(true);

            // Column widths
            foreach ([['A', 30], ['B', 16], ['C', 30], ['D', 14], ['E', 10], ['F', 22]] as [$col, $width]) {
                $sheet->getColumnDimension($col)->setWidth($width);
            }
        });
    }
}
