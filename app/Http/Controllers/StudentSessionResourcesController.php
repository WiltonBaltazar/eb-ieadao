<?php

namespace App\Http\Controllers;

use App\Models\StudySession;
use Inertia\Inertia;
use Inertia\Response;

class StudentSessionResourcesController extends Controller
{
    public function show(StudySession $studySession): Response
    {
        $user = auth()->user();

        if ($studySession->classroom_id !== $user->classroom_id) {
            abort(403);
        }

        $studySession->load('resources', 'classroom', 'teacher');

        $attendance = $studySession->attendances()
            ->where('student_id', $user->id)
            ->first();

        $resources = $studySession->resources->map(fn ($r) => [
            'id'                => $r->id,
            'type'              => $r->type,
            'title'             => $r->title,
            'url'               => $r->url,
            'original_filename' => $r->original_filename,
            'download_url'      => $r->download_url,
        ]);

        return Inertia::render('AulaDetalhe', [
            'studySession' => [
                'id'             => $studySession->id,
                'title'          => $studySession->title,
                'session_date'   => $studySession->session_date->format('d/m/Y'),
                'classroom_name' => $studySession->classroom->name,
                'teacher_name'   => $studySession->teacher?->name,
                'lesson_type'    => $studySession->lesson_type,
                'notes'          => $studySession->notes,
                'status'         => $studySession->status->value,
                'status_label'   => $studySession->status->label(),
                'check_in_url'   => $studySession->checkInUrl(),
            ],
            'resources' => $resources,
            'attended'  => $attendance ? [
                'checked_in_at' => $attendance->checked_in_at->format('H:i · d/m/Y'),
                'method_label'  => $attendance->check_in_method->label(),
            ] : null,
        ]);
    }
}
