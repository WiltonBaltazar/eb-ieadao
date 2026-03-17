<?php

namespace App\Http\Controllers;

use App\Models\StudySession;
use Inertia\Inertia;
use Inertia\Response;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class SessionQrController extends Controller
{
    public function show(StudySession $studySession): Response
    {
        $studySession->load('classroom');

        $checkInUrl = $studySession->checkInUrl();

        // Generate QR code as SVG
        $qrSvg = null;
        if ($studySession->isOpen()) {
            $qrSvg = base64_encode(QrCode::format('svg')->size(300)->generate($checkInUrl));
        }

        return Inertia::render('SessaoQr', [
            'studySession' => [
                'id' => $studySession->id,
                'title' => $studySession->title,
                'session_date' => $studySession->session_date->format('d/m/Y'),
                'status' => $studySession->status->value,
                'classroom_name' => $studySession->classroom->name,
                'check_in_code' => $studySession->check_in_code,
                'check_in_code_expires_at' => $studySession->check_in_code_expires_at?->toISOString(),
            ],
            'qrSvg' => $qrSvg,
            'checkInUrl' => $checkInUrl,
        ]);
    }
}
