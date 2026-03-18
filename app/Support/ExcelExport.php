<?php

namespace App\Support;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ExcelExport
{
    public static function download(string $filename, callable $build): BinaryFileResponse
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        $build($sheet, $spreadsheet);

        $tmp = tempnam(sys_get_temp_dir(), 'xlsx_') . '.xlsx';
        (new Xlsx($spreadsheet))->save($tmp);

        return response()->download($tmp, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /** Apply a header row style (bold, coloured background). */
    public static function styleHeader(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet, string $range): void
    {
        $sheet->getStyle($range)->applyFromArray([
            'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF4F46E5']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFE2E8F0']]],
        ]);
    }

    /** Apply zebra-stripe and border to data rows. */
    public static function styleData(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet, string $range, bool $odd): void
    {
        $sheet->getStyle($range)->applyFromArray([
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['argb' => $odd ? 'FFF8FAFC' : 'FFFFFFFF'],
            ],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFE2E8F0']]],
        ]);
    }
}
