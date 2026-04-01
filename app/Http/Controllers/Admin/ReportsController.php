<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Setting;
use App\Models\StudySession;
use App\Models\User;
use App\Support\ExcelExport;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportsController extends Controller
{
    public function index(): Response
    {
        $threshold = Setting::attendanceThreshold();

        // Below threshold
        $belowThreshold = User::where('role', 'student')
            ->whereNotNull('classroom_id')
            ->with('classroom')
            ->get()
            ->filter(fn ($s) => (function () use ($s, $threshold) {
                $r = $s->attendanceRatio();
                return $r['total'] > 0 && $r['rate'] < $threshold;
            })())
            ->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'phone' => $s->phone,
                'classroom_name' => $s->classroom?->name,
                ...$s->attendanceRatio(),
            ])
            ->values();

        // All classrooms for the filter dropdown (active or not)
        $classrooms = Classroom::orderBy('name')
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'is_active' => $c->is_active,
            ]);

        $availableYears = Enrollment::distinct()
            ->orderByDesc('academic_year')
            ->pluck('academic_year')
            ->values();

        return Inertia::render('Admin/Relatorios', [
            'belowThreshold' => $belowThreshold,
            'threshold' => $threshold,
            'classrooms' => $classrooms,
            'availableYears' => $availableYears,
        ]);
    }

    public function chartData(Request $request): JsonResponse
    {
        $request->validate([
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
            'classroom_id' => 'nullable|exists:classrooms,id',
            'compare' => 'nullable|boolean',
        ]);

        $from = Carbon::parse($request->from)->startOfDay();
        $to = Carbon::parse($request->to)->endOfDay();
        $classroomId = $request->input('classroom_id');
        $compare = $request->boolean('compare', false);

        $current = $this->getDailyAttendance($from, $to, $classroomId);

        $previous = [];
        if ($compare) {
            $days = $from->diffInDays($to) + 1;
            $prevFrom = $from->copy()->subDays($days);
            $prevTo = $from->copy()->subDay()->endOfDay();
            $previous = $this->getDailyAttendance($prevFrom, $prevTo, $classroomId);
        }

        return response()->json([
            'current' => $current,
            'previous' => $previous,
            'from' => $from->format('Y-m-d'),
            'to' => $to->format('Y-m-d'),
        ]);
    }

    private function getDailyAttendance(Carbon $from, Carbon $to, ?int $classroomId): array
    {
        $query = StudySession::with('attendances')
            ->whereIn('status', ['open', 'closed'])
            ->whereBetween('session_date', [$from, $to]);

        if ($classroomId) {
            $query->where('classroom_id', $classroomId);
        }

        $sessions = $query->get();

        // Group attendance counts by date
        $byDate = [];
        foreach ($sessions as $session) {
            $date = $session->session_date->format('Y-m-d');
            $byDate[$date] = ($byDate[$date] ?? 0) + $session->attendances->count();
        }

        // Only return days that actually had sessions, sorted chronologically
        $result = [];
        foreach ($byDate as $date => $count) {
            $result[] = [
                'date'  => $date,
                'label' => Carbon::parse($date)->format('d/m'),
                'count' => $count,
            ];
        }
        usort($result, fn ($a, $b) => strcmp($a['date'], $b['date']));

        return $result;
    }

    public function registros(Request $request): Response
    {
        $query = Attendance::with(['session.classroom', 'student', 'markedBy'])
            ->latest('checked_in_at');

        if ($request->filled('classroom_id')) {
            $query->whereHas('session', fn ($q) => $q->where('classroom_id', $request->classroom_id));
        }
        if ($request->filled('session_id')) {
            $query->where('study_session_id', $request->session_id);
        }
        if ($request->filled('method')) {
            $query->where('check_in_method', $request->method);
        }

        $attendances = $query->paginate(25)->through(fn ($a) => [
            'id' => $a->id,
            'student_name' => $a->student->name,
            'student_phone' => $a->student->phone,
            'session_title' => $a->session->title,
            'session_date' => $a->session->session_date->format('d/m/Y'),
            'classroom_name' => $a->session->classroom->name,
            'method' => $a->check_in_method->value,
            'method_label' => $a->check_in_method->label(),
            'checked_in_at' => $a->checked_in_at->format('d/m/Y H:i'),
            'marked_by' => $a->markedBy?->name,
        ]);

        $classrooms = Classroom::all()->map(fn ($c) => ['id' => $c->id, 'name' => $c->name]);
        $sessions = StudySession::latest('session_date')->get()->map(fn ($s) => [
            'id' => $s->id,
            'title' => $s->title,
            'session_date' => $s->session_date->format('d/m/Y'),
        ]);

        return Inertia::render('Admin/Relatorios', [
            'tab' => 'registros',
            'attendances' => $attendances,
            'classrooms' => $classrooms,
            'sessions' => $sessions,
            'filters' => $request->only(['classroom_id', 'session_id', 'method']),
        ]);
    }

    public function exportCsv(Request $request): StreamedResponse
    {
        $year = $request->filled('year') ? (int) $request->year : null;

        $query = Attendance::with(['session.classroom', 'student', 'markedBy'])
            ->latest('checked_in_at');

        if ($request->filled('classroom_id')) {
            $query->whereHas('session', fn ($q) => $q->where('classroom_id', $request->classroom_id));
        }

        if ($year) {
            $query->whereHas('session', fn ($q) => $q->whereYear('session_date', $year));
        }

        $attendances = $query->get();

        $filename = $year ? "presencas_{$year}.csv" : 'presencas.csv';

        return response()->streamDownload(function () use ($attendances) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Nome', 'Telefone', 'Sessão', 'Data', 'Turma', 'Método', 'Hora']);

            foreach ($attendances as $a) {
                fputcsv($handle, [
                    $a->student->name,
                    $a->student->phone,
                    $a->session->title,
                    $a->session->session_date->format('d/m/Y'),
                    $a->session->classroom->name,
                    $a->check_in_method->label(),
                    $a->checked_in_at->format('d/m/Y H:i'),
                ]);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    public function exportClassroomExcel(Request $request, Classroom $classroom): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $year = $request->filled('year') ? (int) $request->year : null;

        $sessionsQuery = StudySession::where('classroom_id', $classroom->id)
            ->whereIn('status', ['open', 'closed']);

        if ($year) {
            $sessionsQuery->whereYear('session_date', $year);
        }

        $sessions = $sessionsQuery->orderBy('session_date')->get();
        $sessionIds = $sessions->pluck('id');
        $totalSessions = $sessions->count();

        $students = User::where('classroom_id', $classroom->id)
            ->where('role', 'student')
            ->with([
                'attendances' => fn ($q) => $q->whereIn('study_session_id', $sessionIds),
                'enrollments' => fn ($q) => $q->where('classroom_id', $classroom->id)
                    ->when($year, fn ($q) => $q->where('academic_year', $year))
                    ->whereNull('transferred_at'),
            ])
            ->orderBy('name')
            ->get()
            ->map(function ($s) use ($sessions) {
                $enrollment = $s->enrollments->first();
                $enrolledAt = $enrollment?->enrolled_at?->toDateString();

                $eligibleSessions = $enrolledAt
                    ? $sessions->filter(fn ($sess) => $sess->session_date->toDateString() >= $enrolledAt)
                    : $sessions;

                $eligibleIds = $eligibleSessions->pluck('id')->all();
                $total       = $eligibleSessions->count();
                $attended    = $s->attendances->whereIn('study_session_id', $eligibleIds)->count();

                return [
                    'name'    => $s->name,
                    'phone'   => $s->phone ?? '',
                    'grupo'   => $s->grupo_homogeneo?->label() ?? '',
                    'attended' => $attended,
                    'total'   => $total,
                    'rate'    => $total > 0 ? round(($attended / $total) * 100) : 0,
                ];
            });

        $yearSuffix = $year ? "_{$year}" : '';
        $filename = 'assiduidade_' . str($classroom->name)->slug('_') . $yearSuffix . '.xlsx';

        return ExcelExport::download($filename, function ($sheet) use ($classroom, $students, $totalSessions, $year) {
            // Title
            $title = 'Assiduidade — ' . $classroom->name;
            if ($year) {
                $title .= ' (' . $year . ')';
            }
            $sheet->setCellValue('A1', $title);
            $sheet->setCellValue('A2', 'Total de sessões: ' . $totalSessions . '  ·  Exportado em ' . now()->format('d/m/Y'));
            $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(13);
            $sheet->getStyle('A2')->getFont()->setSize(10)->getColor()->setARGB('FF64748B');
            $sheet->mergeCells('A1:F1');
            $sheet->mergeCells('A2:F2');

            // Headers
            $headers = ['Nome', 'Telefone', 'Grupo Homogéneo', 'Presenças', 'Total Sessões', 'Taxa (%)'];
            foreach ($headers as $i => $h) {
                $sheet->setCellValue([$i + 1, 4], $h);
            }
            ExcelExport::styleHeader($sheet, 'A4:F4');
            $sheet->getRowDimension(4)->setRowHeight(22);

            // Data
            foreach ($students as $idx => $s) {
                $row = $idx + 5;
                $sheet->setCellValue([1, $row], $s['name']);
                $sheet->setCellValue([2, $row], $s['phone']);
                $sheet->setCellValue([3, $row], $s['grupo']);
                $sheet->setCellValue([4, $row], $s['attended']);
                $sheet->setCellValue([5, $row], $s['total']);
                $sheet->setCellValue([6, $row], $s['rate'] . '%');
                ExcelExport::styleData($sheet, "A{$row}:F{$row}", $idx % 2 === 0);

                // Colour the rate cell
                $rateCell = "F{$row}";
                $color = $s['rate'] >= 75 ? 'FFD1FAE5' : ($s['rate'] >= 50 ? 'FFFEF3C7' : 'FFFEE2E2');
                $sheet->getStyle($rateCell)->getFill()
                    ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                    ->getStartColor()->setARGB($color);
            }

            // Column widths
            foreach ([['A', 30], ['B', 16], ['C', 32], ['D', 12], ['E', 14], ['F', 12]] as [$col, $width]) {
                $sheet->getColumnDimension($col)->setWidth($width);
            }

            // Centre numeric columns
            $sheet->getStyle('D5:F' . ($students->count() + 4))->getAlignment()
                ->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
        });
    }
}
