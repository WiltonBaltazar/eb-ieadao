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
use Symfony\Component\HttpFoundation\BinaryFileResponse;

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

        // Group attendance counts by date, broken down by location
        $byDate = [];
        foreach ($sessions as $session) {
            $date = $session->session_date->format('Y-m-d');
            if (!isset($byDate[$date])) {
                $byDate[$date] = ['na_igreja' => 0, 'online' => 0];
            }
            foreach ($session->attendances as $attendance) {
                if ($attendance->location?->value === 'online') {
                    $byDate[$date]['online']++;
                } else {
                    $byDate[$date]['na_igreja']++;
                }
            }
        }

        // Only return days that actually had sessions, sorted chronologically
        $result = [];
        foreach ($byDate as $date => $counts) {
            $result[] = [
                'date'      => $date,
                'label'     => Carbon::parse($date)->format('d/m'),
                'count'     => $counts['na_igreja'] + $counts['online'],
                'na_igreja' => $counts['na_igreja'],
                'online'    => $counts['online'],
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

    public function exportAllExcel(Request $request): BinaryFileResponse
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

        $filename = $year ? "presencas_{$year}.xlsx" : 'presencas_todas.xlsx';

        return ExcelExport::download($filename, function ($sheet) use ($attendances, $year) {
            $title = $year ? "Presenças — {$year}" : 'Todas as Presenças';
            $sheet->setCellValue('A1', $title);
            $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(13);
            $sheet->mergeCells('A1:H1');
            $sheet->getRowDimension(1)->setRowHeight(20);

            foreach (['Nome', 'Telefone', 'Sessão', 'Data', 'Turma', 'Método', 'Localização', 'Hora'] as $i => $h) {
                $sheet->setCellValue([$i + 1, 3], $h);
            }
            ExcelExport::styleHeader($sheet, 'A3:H3');
            $sheet->getRowDimension(3)->setRowHeight(20);

            foreach ($attendances as $idx => $a) {
                $row = $idx + 4;
                $sheet->setCellValue([1, $row], $a->student->name);
                $sheet->setCellValue([2, $row], $a->student->phone);
                $sheet->setCellValue([3, $row], $a->session->title);
                $sheet->setCellValue([4, $row], $a->session->session_date->format('d/m/Y'));
                $sheet->setCellValue([5, $row], $a->session->classroom->name);
                $sheet->setCellValue([6, $row], $a->check_in_method->label());
                $sheet->setCellValue([7, $row], $a->location?->label() ?? 'Na Igreja');
                $sheet->setCellValue([8, $row], $a->checked_in_at->format('d/m/Y H:i'));
                ExcelExport::styleData($sheet, "A{$row}:H{$row}", $idx % 2 === 0);
            }

            foreach ([['A', 28], ['B', 14], ['C', 32], ['D', 12], ['E', 22], ['F', 14], ['G', 12], ['H', 16]] as [$col, $width]) {
                $sheet->getColumnDimension($col)->setWidth($width);
            }
        });
    }

    public function exportPeriodExcel(Request $request): BinaryFileResponse
    {
        $request->validate([
            'from'         => 'required|date',
            'to'           => 'required|date|after_or_equal:from',
            'classroom_id' => 'nullable|exists:classrooms,id',
        ]);

        $from        = Carbon::parse($request->from)->startOfDay();
        $to          = Carbon::parse($request->to)->endOfDay();
        $classroomId = $request->input('classroom_id');

        $query = StudySession::with(['attendances', 'classroom'])
            ->whereIn('status', ['open', 'closed'])
            ->whereBetween('session_date', [$from, $to])
            ->orderBy('session_date');

        if ($classroomId) {
            $query->where('classroom_id', $classroomId);
        }

        $sessions = $query->get()->map(function ($session) {
            $attended  = $session->attendances->count();
            $naIgreja  = $session->attendances->filter(fn ($a) => $a->location?->value !== 'online')->count();
            $online    = $session->attendances->filter(fn ($a) => $a->location?->value === 'online')->count();

            $enrolled = Enrollment::where('classroom_id', $session->classroom_id)
                ->where('academic_year', $session->session_date->year)
                ->where('enrolled_at', '<=', $session->session_date)
                ->where(fn ($q) => $q->whereNull('transferred_at')
                    ->orWhere('transferred_at', '>', $session->session_date))
                ->count();

            return [
                'date'      => $session->session_date->format('d/m/Y'),
                'title'     => $session->title,
                'na_igreja' => $naIgreja,
                'online'    => $online,
                'classroom' => $session->classroom->name,
                'attended'  => $attended,
                'enrolled'  => $enrolled,
                'rate'      => $enrolled > 0 ? round(($attended / $enrolled) * 100) : 0,
            ];
        });

        $suffix   = $from->format('Y-m-d') . '_' . $to->format('Y-m-d');
        $filename = "presencas_{$suffix}.xlsx";

        return ExcelExport::download($filename, function ($sheet) use ($sessions, $from, $to, $classroomId) {
            $classroomName = $classroomId ? Classroom::find($classroomId)?->name : 'Todas as turmas';

            $sheet->setCellValue('A1', "Relatório de Presenças — {$from->format('d/m/Y')} a {$to->format('d/m/Y')}");
            $sheet->setCellValue('A2', "{$classroomName}  ·  Exportado em " . now()->format('d/m/Y'));
            $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(13);
            $sheet->getStyle('A2')->getFont()->setSize(10)->getColor()->setARGB('FF64748B');
            $sheet->mergeCells('A1:H1');
            $sheet->mergeCells('A2:H2');

            foreach (['Data', 'Sessão', 'Turma', 'Na Igreja', 'Online', 'Total', 'Matriculados', 'Taxa (%)'] as $i => $h) {
                $sheet->setCellValue([$i + 1, 4], $h);
            }
            ExcelExport::styleHeader($sheet, 'A4:H4');
            $sheet->getRowDimension(4)->setRowHeight(22);

            foreach ($sessions as $idx => $s) {
                $row = $idx + 5;
                $sheet->setCellValue([1, $row], $s['date']);
                $sheet->setCellValue([2, $row], $s['title']);
                $sheet->setCellValue([3, $row], $s['classroom']);
                $sheet->setCellValue([4, $row], $s['na_igreja']);
                $sheet->setCellValue([5, $row], $s['online']);
                $sheet->setCellValue([6, $row], $s['attended']);
                $sheet->setCellValue([7, $row], $s['enrolled']);
                $sheet->setCellValue([8, $row], $s['rate'] . '%');
                ExcelExport::styleData($sheet, "A{$row}:H{$row}", $idx % 2 === 0);

                $color = $s['rate'] >= 75 ? 'FFD1FAE5' : ($s['rate'] >= 50 ? 'FFFEF3C7' : 'FFFEE2E2');
                $sheet->getStyle("H{$row}")->getFill()
                    ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                    ->getStartColor()->setARGB($color);
            }

            foreach ([['A', 12], ['B', 38], ['C', 22], ['D', 12], ['E', 10], ['F', 10], ['G', 14], ['H', 12]] as [$col, $width]) {
                $sheet->getColumnDimension($col)->setWidth($width);
            }

            if ($sessions->count() > 0) {
                $sheet->getStyle('D5:H' . ($sessions->count() + 4))->getAlignment()
                    ->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
            }
        });
    }

    public function exportStudentsPeriodExcel(Request $request): BinaryFileResponse
    {
        $request->validate([
            'from'         => 'required|date',
            'to'           => 'required|date|after_or_equal:from',
            'classroom_id' => 'nullable|exists:classrooms,id',
        ]);

        $from        = Carbon::parse($request->from)->startOfDay();
        $to          = Carbon::parse($request->to)->endOfDay();
        $classroomId = $request->input('classroom_id');

        // Sessions in the period
        $sessionsQuery = StudySession::whereIn('status', ['open', 'closed'])
            ->whereBetween('session_date', [$from, $to])
            ->orderBy('session_date');

        if ($classroomId) {
            $sessionsQuery->where('classroom_id', $classroomId);
        }

        $sessions    = $sessionsQuery->get();
        $sessionIds  = $sessions->pluck('id');

        // Students enrolled in the relevant classrooms
        $classroomIds = $classroomId
            ? [$classroomId]
            : $sessions->pluck('classroom_id')->unique()->values()->all();

        $students = User::where('role', 'student')
            ->whereIn('classroom_id', $classroomIds)
            ->with([
                'attendances' => fn ($q) => $q->whereIn('study_session_id', $sessionIds),
                'enrollments' => fn ($q) => $q->whereIn('classroom_id', $classroomIds)
                    ->whereNull('transferred_at'),
            ])
            ->orderBy('name')
            ->get()
            ->map(function ($student) use ($sessions) {
                $enrollment  = $student->enrollments->first();
                $enrolledAt  = $enrollment?->enrolled_at;

                // Only count sessions from the student's enrollment date onward
                $eligible = $enrolledAt
                    ? $sessions->filter(fn ($s) => $s->classroom_id === $student->classroom_id
                        && $s->session_date->toDateString() >= $enrolledAt->toDateString())
                    : $sessions->filter(fn ($s) => $s->classroom_id === $student->classroom_id);

                $eligibleIds    = $eligible->pluck('id')->all();
                $total          = $eligible->count();
                $eligibleAttend = $student->attendances->whereIn('study_session_id', $eligibleIds);
                $attended       = $eligibleAttend->count();
                $naIgreja       = $eligibleAttend->filter(fn ($a) => $a->location?->value !== 'online')->count();
                $online         = $eligibleAttend->filter(fn ($a) => $a->location?->value === 'online')->count();

                return [
                    'name'      => $student->name,
                    'phone'     => $student->phone ?? '',
                    'classroom' => $student->classroom?->name ?? '',
                    'grupo'     => $student->grupo_homogeneo?->label() ?? '',
                    'na_igreja' => $naIgreja,
                    'online'    => $online,
                    'attended'  => $attended,
                    'total'     => $total,
                    'rate'      => $total > 0 ? round(($attended / $total) * 100) : 0,
                ];
            });

        $suffix   = $from->format('Y-m-d') . '_' . $to->format('Y-m-d');
        $filename = "alunos_presencas_{$suffix}.xlsx";

        return ExcelExport::download($filename, function ($sheet) use ($students, $from, $to, $classroomId) {
            $classroomName = $classroomId ? Classroom::find($classroomId)?->name : 'Todas as turmas';

            $sheet->setCellValue('A1', "Presenças por Aluno — {$from->format('d/m/Y')} a {$to->format('d/m/Y')}");
            $sheet->setCellValue('A2', "{$classroomName}  ·  Exportado em " . now()->format('d/m/Y'));
            $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(13);
            $sheet->getStyle('A2')->getFont()->setSize(10)->getColor()->setARGB('FF64748B');
            $sheet->mergeCells('A1:I1');
            $sheet->mergeCells('A2:I2');

            foreach (['Nome', 'Telefone', 'Turma', 'Grupo Homogéneo', 'Na Igreja', 'Online', 'Total', 'Sessões', 'Taxa (%)'] as $i => $h) {
                $sheet->setCellValue([$i + 1, 4], $h);
            }
            ExcelExport::styleHeader($sheet, 'A4:I4');
            $sheet->getRowDimension(4)->setRowHeight(22);

            foreach ($students as $idx => $s) {
                $row = $idx + 5;
                $sheet->setCellValue([1, $row], $s['name']);
                $sheet->setCellValue([2, $row], $s['phone']);
                $sheet->setCellValue([3, $row], $s['classroom']);
                $sheet->setCellValue([4, $row], $s['grupo']);
                $sheet->setCellValue([5, $row], $s['na_igreja']);
                $sheet->setCellValue([6, $row], $s['online']);
                $sheet->setCellValue([7, $row], $s['attended']);
                $sheet->setCellValue([8, $row], $s['total']);
                $sheet->setCellValue([9, $row], $s['rate'] . '%');
                ExcelExport::styleData($sheet, "A{$row}:I{$row}", $idx % 2 === 0);

                $color = $s['rate'] >= 75 ? 'FFD1FAE5' : ($s['rate'] >= 50 ? 'FFFEF3C7' : 'FFFEE2E2');
                $sheet->getStyle("I{$row}")->getFill()
                    ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                    ->getStartColor()->setARGB($color);
            }

            foreach ([['A', 30], ['B', 16], ['C', 22], ['D', 24], ['E', 11], ['F', 10], ['G', 10], ['H', 12], ['I', 12]] as [$col, $width]) {
                $sheet->getColumnDimension($col)->setWidth($width);
            }

            if ($students->count() > 0) {
                $sheet->getStyle('E5:I' . ($students->count() + 4))->getAlignment()
                    ->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
            }
        });
    }

    public function exportMapaPresencasExcel(Request $request, Classroom $classroom): BinaryFileResponse
    {
        $classroom->load('teachers');

        $year = $request->filled('year') ? (int) $request->year : now()->year;

        $sessions = StudySession::where('classroom_id', $classroom->id)
            ->whereIn('status', ['open', 'closed'])
            ->whereYear('session_date', $year)
            ->orderBy('session_date')
            ->get();

        $sessionIds = $sessions->pluck('id');

        // [student_id => collection(session_id => location_value)]
        $attendanceSet = Attendance::whereIn('study_session_id', $sessionIds)
            ->get(['student_id', 'study_session_id', 'location'])
            ->groupBy('student_id')
            ->map(fn ($rows) => $rows->mapWithKeys(fn ($a) => [
                $a->study_session_id => $a->location?->value ?? 'na_igreja',
            ]));

        $students = User::where('classroom_id', $classroom->id)
            ->whereIn('role', ['student', 'teacher'])
            ->with([
                'enrollments' => fn ($q) => $q->where('classroom_id', $classroom->id)
                    ->where('academic_year', $year),
            ])
            ->orderBy('name')
            ->get();

        $filename = 'ficha_presencas_' . str($classroom->name)->slug('_') . "_{$year}.xlsx";

        // Load teachers on sessions for the Professores sheet
        $sessions->load('teacher');

        return ExcelExport::download($filename, function ($sheet, $spreadsheet) use ($classroom, $sessions, $students, $attendanceSet, $year) {
            $coord     = fn ($col) => \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col);
            $Fill      = \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID;
            $HCenter   = \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER;
            $VCenter   = \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER;
            $ThinBorder = \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN;
            $monthPt   = [1=>'JAN',2=>'FEV',3=>'MAR',4=>'ABR',5=>'MAI',6=>'JUN',
                          7=>'JUL',8=>'AGO',9=>'SET',10=>'OUT',11=>'NOV',12=>'DEZ'];

            $firstCol      = 7; // G
            $totalSessions = $sessions->count();
            $lastSessionCol = max($firstCol + $totalSessions - 1, $firstCol);
            // Summary columns after sessions: IGREJA | ONLINE | TOTAL
            $colIgreja     = $lastSessionCol + 1;
            $colOnline     = $lastSessionCol + 2;
            $colTotal      = $lastSessionCol + 3;
            $lastCol       = $colTotal;
            $lastLetter    = $coord($lastCol);

            // ── NAME THE FIRST SHEET ──────────────────────────────────
            $sheet->setTitle('Presenças');

            // ── ROWS 1-4: HEADER INFO ─────────────────────────────────
            $sheet->mergeCells('A1:F1');
            $sheet->setCellValue('A1', 'FICHA DE PRESENÇAS — ESTUDO BÍBLICO ' . $year);
            $sheet->getStyle('A1')->applyFromArray([
                'font'      => ['bold' => true, 'size' => 20, 'color' => ['argb' => 'FF4B5563']],
                'alignment' => ['horizontal' => $HCenter, 'vertical' => $VCenter],
            ]);
            $sheet->getRowDimension(1)->setRowHeight(18);

            $sheet->mergeCells('A2:F2');
            $sheet->setCellValue('A2', mb_strtoupper('Aperfeiçoamento dos Santos', 'UTF-8'));
            $sheet->getStyle('A2')->applyFromArray([
                'font'      => ['bold' => true, 'size' => 20],
                'alignment' => ['horizontal' => $HCenter, 'vertical' => $VCenter],
            ]);
            $sheet->getRowDimension(2)->setRowHeight(28);

            $sheet->mergeCells('A3:F3');
            $sheet->getStyle('A3')->applyFromArray([
                'font'      => ['size' => 10, 'color' => ['argb' => 'FF374151']],
                'alignment' => ['horizontal' => $HCenter],
            ]);
            $sheet->getRowDimension(3)->setRowHeight(16);

            // ── ROW 5 (gap) then ROW 6: MONTH LABELS ─────────────────
            // Build month groups: month => {startCol, endCol}
            $monthGroups = [];
            foreach ($sessions as $i => $session) {
                $month = (int) $session->session_date->format('n');
                $col   = $firstCol + $i;
                if (!isset($monthGroups[$month])) {
                    $monthGroups[$month] = ['label' => $monthPt[$month], 'start' => $col, 'end' => $col];
                } else {
                    $monthGroups[$month]['end'] = $col;
                }
            }

            foreach ($monthGroups as $grp) {
                $startCell = $coord($grp['start']) . '6';
                $endCell   = $coord($grp['end']) . '6';
                $sheet->setCellValue($startCell, $grp['label']);
                if ($grp['start'] !== $grp['end']) {
                    $sheet->mergeCells("{$startCell}:{$endCell}");
                }
                $sheet->getStyle("{$startCell}:{$endCell}")->applyFromArray([
                    'font'      => ['bold' => true, 'color' => ['argb' => 'FF1E3A5F']],
                    'fill'      => ['fillType' => $Fill, 'startColor' => ['argb' => 'FFD9E1F2']],
                    'alignment' => ['horizontal' => $HCenter, 'vertical' => $VCenter],
                    'borders'   => ['outline' => ['borderStyle' => $ThinBorder, 'color' => ['argb' => 'FFAAB4D4']]],
                ]);
            }
            // "Tipo de participação" spans IGREJA+ONLINE across rows 6-7
            $sheet->mergeCells($coord($colIgreja) . '6:' . $coord($colOnline) . '7');
            $sheet->setCellValue($coord($colIgreja) . '6', 'Tipo de participação');
            $sheet->getStyle($coord($colIgreja) . '6:' . $coord($colOnline) . '7')->applyFromArray([
                'font'      => ['bold' => true, 'size' => 8, 'color' => ['argb' => 'FF1E3A5F']],
                'fill'      => ['fillType' => $Fill, 'startColor' => ['argb' => 'FFD9E1F2']],
                'alignment' => ['horizontal' => $HCenter, 'vertical' => $VCenter, 'wrapText' => true],
                'borders'   => ['outline' => ['borderStyle' => $ThinBorder, 'color' => ['argb' => 'FFAAB4D4']]],
            ]);

            // "TOTAL" spans its own column across rows 6-7
            $sheet->mergeCells($coord($colTotal) . '6:' . $coord($colTotal) . '7');
            $sheet->setCellValue($coord($colTotal) . '6', 'TOTAL');
            $sheet->getStyle($coord($colTotal) . '6:' . $coord($colTotal) . '7')->applyFromArray([
                'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => 'FF1E3A5F']],
                'fill'      => ['fillType' => $Fill, 'startColor' => ['argb' => 'FFD9E1F2']],
                'alignment' => ['horizontal' => $HCenter, 'vertical' => $VCenter],
                'borders'   => ['outline' => ['borderStyle' => $ThinBorder, 'color' => ['argb' => 'FFAAB4D4']]],
            ]);

            $sheet->getRowDimension(6)->setRowHeight(18);

            // ── ROW 7: DAY NUMBERS ────────────────────────────────────
            foreach ($sessions as $i => $session) {
                $col  = $firstCol + $i;
                $cell = $coord($col) . '7';
                $sheet->setCellValue($cell, (int) $session->session_date->format('j'));
                $sheet->getStyle($cell)->applyFromArray([
                    'font'      => ['bold' => true, 'size' => 9],
                    'fill'      => ['fillType' => $Fill, 'startColor' => ['argb' => 'FFEEF2FA']],
                    'alignment' => ['horizontal' => $HCenter],
                ]);
            }
            $sheet->getRowDimension(7)->setRowHeight(15);

            // ── ROW 9: COLUMN HEADERS ─────────────────────────────────
            foreach (['ORD', 'NOME', 'CONTACTO', 'WA', 'Email', 'GH'] as $i => $h) {
                $sheet->setCellValue([$i + 1, 9], $h);
            }
            for ($i = 0; $i < $totalSessions; $i++) {
                $sheet->setCellValue([$firstCol + $i, 9], $i + 1);
            }
            // Summary headers
            $sheet->setCellValue([$colIgreja, 9], 'IGREJA');
            $sheet->setCellValue([$colOnline, 9], 'ONLINE');
            $sheet->setCellValue([$colTotal,  9], 'TOTAL');
            $headerRange = "A9:{$lastLetter}9";
            $sheet->getStyle($headerRange)->applyFromArray([
                'font'      => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF'], 'size' => 9],
                'fill'      => ['fillType' => $Fill, 'startColor' => ['argb' => 'FF2E4A7A']],
                'alignment' => ['horizontal' => $HCenter, 'vertical' => $VCenter],
                'borders'   => ['allBorders' => ['borderStyle' => $ThinBorder, 'color' => ['argb' => 'FF1E3A5F']]],
            ]);
            $sheet->getRowDimension(9)->setRowHeight(20);

            // ── ROWS 10+: STUDENT DATA ────────────────────────────────
            foreach ($students as $idx => $student) {
                $row        = 10 + $idx;
                $enrollment = $student->enrollments->first();
                $enrolledAt = $enrollment?->enrolled_at?->toDateString();
                // $attended is now a collection [session_id => location_value]
                $attended   = $attendanceSet[$student->id] ?? collect();
                $firstPDone = false;
                $cntIgreja  = 0;
                $cntOnline  = 0;

                // If no enrollment date, derive the cutoff from the earliest session attended
                if (!$enrolledAt && $attended->isNotEmpty()) {
                    $attendedSessionIds   = $attended->keys()->all();
                    $firstAttendedSession = $sessions
                        ->filter(fn ($s) => in_array($s->id, $attendedSessionIds))
                        ->sortBy('session_date')
                        ->first();
                    $enrolledAt = $firstAttendedSession?->session_date->toDateString();
                }

                // Fixed columns
                $sheet->setCellValue([1, $row], $idx + 1);
                $sheet->setCellValue([2, $row], $student->name);
                $sheet->setCellValue([3, $row], $student->phone ?: ($student->whatsapp ?? ''));
                $sheet->setCellValue([4, $row], $student->whatsapp ?? '');
                $sheet->setCellValue([5, $row], $student->email ?? '');
                $sheet->setCellValue([6, $row], $student->grupo_homogeneo?->short() ?? '');

                // Zebra stripe on fixed columns
                $stripeBg = $idx % 2 === 0 ? 'FFF1F5FB' : 'FFFFFFFF';
                $sheet->getStyle("A{$row}:F{$row}")->getFill()
                    ->setFillType($Fill)->getStartColor()->setARGB($stripeBg);

                // Session columns
                foreach ($sessions as $i => $session) {
                    $col      = $firstCol + $i;
                    $cellRef  = $coord($col) . $row;
                    $sessDate = $session->session_date->toDateString();

                    // Blank/grey if before enrollment
                    if ($enrolledAt && $sessDate < $enrolledAt) {
                        $sheet->getStyle($cellRef)->getFill()
                            ->setFillType($Fill)->getStartColor()->setARGB('FFE8E8E8');
                        continue;
                    }

                    if ($attended->has($session->id)) {
                        $location = $attended->get($session->id);
                        if ($location === 'online') {
                            $cntOnline++;
                        } else {
                            $cntIgreja++;
                        }

                        $sheet->setCellValue($cellRef, 'P');
                        if (!$firstPDone) {
                            // First lesson: orange cell, black text
                            $sheet->getStyle($cellRef)->getFill()
                                ->setFillType($Fill)->getStartColor()->setARGB('FFFFC000');
                            $sheet->getStyle($cellRef)->getFont()->getColor()->setARGB('FF000000');
                            $firstPDone = true;
                        } else {
                            // Subsequent presences: white cell, black text
                            $sheet->getStyle($cellRef)->getFill()
                                ->setFillType($Fill)->getStartColor()->setARGB('FFFFFFFF');
                            $sheet->getStyle($cellRef)->getFont()->getColor()->setARGB('FF000000');
                        }
                    } else {
                        // Absence: red cell, black text
                        $sheet->setCellValue($cellRef, 'F');
                        $sheet->getStyle($cellRef)->getFill()
                            ->setFillType($Fill)->getStartColor()->setARGB('FFFF0000');
                        $sheet->getStyle($cellRef)->getFont()->getColor()->setARGB('FF000000');
                    }

                    $sheet->getStyle($cellRef)->applyFromArray([
                        'font'      => ['bold' => true, 'size' => 9],
                        'alignment' => ['horizontal' => $HCenter, 'vertical' => $VCenter],
                    ]);
                }

                // ── Summary cells ─────────────────────────────────────
                $cntTotal = $cntIgreja + $cntOnline;
                $sheet->setCellValue([$colIgreja, $row], $cntIgreja);
                $sheet->setCellValue([$colOnline, $row], $cntOnline);
                $sheet->setCellValue([$colTotal,  $row], $cntTotal);

                $summaryRange = $coord($colIgreja) . $row . ':' . $coord($colTotal) . $row;
                $sheet->getStyle($summaryRange)->applyFromArray([
                    'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => 'FF000000']],
                    'alignment' => ['horizontal' => $HCenter, 'vertical' => $VCenter],
                    'fill'      => ['fillType' => $Fill, 'startColor' => ['argb' => $stripeBg]],
                ]);

                // Row border
                $sheet->getStyle("A{$row}:{$lastLetter}{$row}")->getBorders()
                    ->getAllBorders()->setBorderStyle($ThinBorder)
                    ->getColor()->setARGB('FFD1D5DB');
            }

            // ── FREEZE PANES ──────────────────────────────────────────
            $sheet->freezePane('G10');

            // ── COLUMN WIDTHS ─────────────────────────────────────────
            $sheet->getColumnDimension('A')->setWidth(5);
            $sheet->getColumnDimension('B')->setWidth(28);
            $sheet->getColumnDimension('C')->setWidth(14);
            $sheet->getColumnDimension('D')->setWidth(14);
            $sheet->getColumnDimension('E')->setWidth(22);
            $sheet->getColumnDimension('F')->setWidth(6);
            for ($i = 0; $i < $totalSessions; $i++) {
                $sheet->getColumnDimension($coord($firstCol + $i))->setWidth(4.5);
            }
            // Summary columns
            $sheet->getColumnDimension($coord($colIgreja))->setWidth(8);
            $sheet->getColumnDimension($coord($colOnline))->setWidth(8);
            $sheet->getColumnDimension($coord($colTotal)) ->setWidth(7);

            // ════════════════════════════════════════════════════════════
            // SHEET 2: PROFESSORES
            // ════════════════════════════════════════════════════════════
            $sheet2 = new \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet($spreadsheet, 'Professores');
            $spreadsheet->addSheet($sheet2);

            // Title
            $sheet2->mergeCells('A1:D1');
            $sheet2->setCellValue('A1', 'PROFESSORES — ' . mb_strtoupper($classroom->name, 'UTF-8') . ' — ' . $year);
            $sheet2->getStyle('A1')->applyFromArray([
                'font'      => ['bold' => true, 'size' => 13],
                'alignment' => ['horizontal' => $HCenter, 'vertical' => $VCenter],
            ]);
            $sheet2->getRowDimension(1)->setRowHeight(24);

            // Headers
            foreach (['Nº', 'Data', 'Título da Aula', 'Professor(a)'] as $i => $h) {
                $sheet2->setCellValue([$i + 1, 3], $h);
            }
            $sheet2->getStyle('A3:D3')->applyFromArray([
                'font'      => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF'], 'size' => 10],
                'fill'      => ['fillType' => $Fill, 'startColor' => ['argb' => 'FF2E4A7A']],
                'alignment' => ['horizontal' => $HCenter, 'vertical' => $VCenter],
                'borders'   => ['allBorders' => ['borderStyle' => $ThinBorder, 'color' => ['argb' => 'FF1E3A5F']]],
            ]);
            $sheet2->getRowDimension(3)->setRowHeight(20);

            // Data rows
            foreach ($sessions as $idx => $session) {
                $row = 4 + $idx;
                $sheet2->setCellValue([1, $row], $idx + 1);
                $sheet2->setCellValue([2, $row], $session->session_date->format('d/m/Y'));
                $sheet2->setCellValue([3, $row], $session->title);
                $sheet2->setCellValue([4, $row], $session->teacher?->name ?? '—');

                $stripeBg = $idx % 2 === 0 ? 'FFF1F5FB' : 'FFFFFFFF';
                $sheet2->getStyle("A{$row}:D{$row}")->applyFromArray([
                    'fill'    => ['fillType' => $Fill, 'startColor' => ['argb' => $stripeBg]],
                    'borders' => ['allBorders' => ['borderStyle' => $ThinBorder, 'color' => ['argb' => 'FFE2E8F0']]],
                ]);
                $sheet2->getStyle("A{$row}:B{$row}")->getAlignment()->setHorizontal($HCenter);
            }

            // Column widths
            $sheet2->getColumnDimension('A')->setWidth(5);
            $sheet2->getColumnDimension('B')->setWidth(14);
            $sheet2->getColumnDimension('C')->setWidth(45);
            $sheet2->getColumnDimension('D')->setWidth(30);
        });
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
