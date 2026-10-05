<?php

namespace App\Services;

use App\Models\StudySession;
use App\Models\User;
use App\Support\ExcelExport;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Pastor's report: students split by modality (online vs na igreja) with attendance rates.
 *
 * A student's modality is the majority location of their check-ins in the year
 * (NULL location counts as na igreja; ties and no attendances count as na igreja).
 */
class PastorReportService
{
    public const ONLINE = 'Online';
    public const NA_IGREJA = 'Na igreja';

    /**
     * One row per student for the academic year, sorted by name.
     * Same rate rule as User::attendanceRatio(): sessions of the student's current classroom,
     * in that year, from the enrollment date onward (fallback: first attended session).
     */
    public function rows(int $year): Collection
    {
        $sessions = StudySession::whereIn('status', ['open', 'closed'])
            ->whereYear('session_date', $year)
            ->orderBy('session_date')
            ->get();

        $sessionIds = $sessions->pluck('id');
        $sessionsByClassroom = $sessions->groupBy('classroom_id');

        return User::where('role', 'student')
            ->whereNotNull('classroom_id')
            ->where(fn ($q) => $q
                ->whereHas('enrollments', fn ($e) => $e->where('academic_year', $year)->whereNull('transferred_at'))
                ->orWhereHas('attendances', fn ($a) => $a->whereIn('study_session_id', $sessionIds)))
            ->with([
                'classroom',
                'attendances' => fn ($q) => $q->whereIn('study_session_id', $sessionIds),
                'enrollments' => fn ($q) => $q->where('academic_year', $year)->whereNull('transferred_at'),
            ])
            ->orderBy('name')
            ->get()
            ->map(function (User $student) use ($sessionsByClassroom) {
                $classroomSessions = $sessionsByClassroom->get($student->classroom_id, collect());
                $classroomIds = $classroomSessions->pluck('id')->all();

                $fromDate = $student->enrollments->firstWhere('classroom_id', $student->classroom_id)?->enrolled_at?->toDateString();

                if (! $fromDate) {
                    $attendedIds = $student->attendances->pluck('study_session_id')->all();
                    $fromDate = $classroomSessions->whereIn('id', $attendedIds)->first()?->session_date?->toDateString();
                }

                $eligible = $fromDate
                    ? $classroomSessions->filter(fn ($s) => $s->session_date->toDateString() >= $fromDate)
                    : $classroomSessions;

                $eligibleIds = $eligible->pluck('id')->all();
                $attendances = $student->attendances->whereIn('study_session_id', $eligibleIds);
                $online = $attendances->filter(fn ($a) => $a->location?->value === 'online')->count();
                $naIgreja = $attendances->count() - $online;
                $total = $eligible->count();
                $attended = $attendances->count();

                return [
                    'name'      => $student->name,
                    'phone'     => $student->phone ?? '',
                    'classroom' => $student->classroom?->name ?? '',
                    'grupo'     => $student->grupo_homogeneo?->label() ?? '',
                    'modality'  => $online > $naIgreja ? self::ONLINE : self::NA_IGREJA,
                    'na_igreja' => $naIgreja,
                    'online'    => $online,
                    'attended'  => $attended,
                    'total'     => $total,
                    'rate'      => $total > 0 ? (int) round(($attended / $total) * 100) : 0,
                ];
            })
            ->values();
    }

    /** The five sheets, keyed by sheet title. */
    public function sheets(int $year, int $minRate): array
    {
        $rows = $this->rows($year);
        $online = $rows->where('modality', self::ONLINE)->values();
        $naIgreja = $rows->where('modality', self::NA_IGREJA)->values();

        return [
            'Online'                   => $online,
            'Na Igreja'                => $naIgreja,
            "Online >{$minRate}%"      => $online->filter(fn ($r) => $r['rate'] > $minRate)->values(),
            "Na Igreja >{$minRate}%"   => $naIgreja->filter(fn ($r) => $r['rate'] > $minRate)->values(),
            'Todos'                    => $rows->sortBy([['rate', 'desc'], ['name', 'asc']])->values(),
        ];
    }

    public function download(int $year, int $minRate): BinaryFileResponse
    {
        $sheets = $this->sheets($year, $minRate);
        $filename = 'RELATORIO_PASTOR_ICI_ACT_' . now()->format('d-m-Y') . '.xlsx';

        return ExcelExport::download($filename, function ($first, $spreadsheet) use ($sheets, $year) {
            $index = 0;
            foreach ($sheets as $title => $rows) {
                $sheet = $index === 0 ? $first : $spreadsheet->createSheet();
                $sheet->setTitle($title);
                $this->writeSheet($sheet, $title, $rows, $year);
                $index++;
            }
        });
    }

    private function writeSheet(Worksheet $sheet, string $title, Collection $rows, int $year): void
    {
        $sheet->setCellValue('A1', "Relatório do Pastor — {$title} — {$year}");
        $sheet->setCellValue('A2', "{$rows->count()} alunos  ·  Exportado em " . now()->format('d/m/Y'));
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(13);
        $sheet->getStyle('A2')->getFont()->setSize(10)->getColor()->setARGB('FF64748B');
        $sheet->mergeCells('A1:J1');
        $sheet->mergeCells('A2:J2');

        foreach (['Nome', 'Telefone', 'Turma', 'Grupo Homogéneo', 'Modalidade', 'Na Igreja', 'Online', 'Total', 'Sessões', 'Taxa (%)'] as $i => $h) {
            $sheet->setCellValue([$i + 1, 4], $h);
        }
        ExcelExport::styleHeader($sheet, 'A4:J4');
        $sheet->getRowDimension(4)->setRowHeight(22);

        foreach ($rows as $idx => $r) {
            $row = $idx + 5;
            $sheet->setCellValue([1, $row], $r['name']);
            $sheet->setCellValueExplicit([2, $row], $r['phone'], DataType::TYPE_STRING);
            $sheet->setCellValue([3, $row], $r['classroom']);
            $sheet->setCellValue([4, $row], $r['grupo']);
            $sheet->setCellValue([5, $row], $r['modality']);
            $sheet->setCellValue([6, $row], $r['na_igreja']);
            $sheet->setCellValue([7, $row], $r['online']);
            $sheet->setCellValue([8, $row], $r['attended']);
            $sheet->setCellValue([9, $row], $r['total']);
            $sheet->setCellValue([10, $row], $r['rate'] . '%');
            ExcelExport::styleData($sheet, "A{$row}:J{$row}", $idx % 2 === 0);

            $color = $r['rate'] >= 75 ? 'FFD1FAE5' : ($r['rate'] >= 50 ? 'FFFEF3C7' : 'FFFEE2E2');
            $sheet->getStyle("J{$row}")->getFill()
                ->setFillType(Fill::FILL_SOLID)
                ->getStartColor()->setARGB($color);
        }

        foreach ([['A', 30], ['B', 16], ['C', 22], ['D', 24], ['E', 13], ['F', 11], ['G', 10], ['H', 10], ['I', 12], ['J', 12]] as [$col, $width]) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        if ($rows->count() > 0) {
            $sheet->getStyle('E5:J' . ($rows->count() + 4))->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_CENTER);
        }
    }
}
