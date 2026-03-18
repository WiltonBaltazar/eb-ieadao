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

        $studySession->load('resources', 'classroom');

        $resources = $studySession->resources->map(fn ($r) => [
            'id'                => $r->id,
            'type'              => $r->type,
            'title'             => $r->title,
            'url'               => $r->url,
            'original_filename' => $r->original_filename,
            'download_url'      => $r->download_url,
        ]);

        return Inertia::render('SessaoRecursos', [
            'studySession' => [
                'id'             => $studySession->id,
                'title'          => $studySession->title,
                'session_date'   => $studySession->session_date->format('d/m/Y'),
                'classroom_name' => $studySession->classroom->name,
            ],
            'resources' => $resources,
        ]);
    }
}
