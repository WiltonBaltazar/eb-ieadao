<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LessonResource;
use App\Models\StudySession;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LessonResourcesController extends Controller
{
    public function store(Request $request, StudySession $studySession): RedirectResponse
    {
        $request->validate([
            'type'  => 'required|in:file,link',
            'title' => 'nullable|string|max:255',
            'file'  => 'required_if:type,file|file|mimes:pdf|max:20480',
            'url'   => 'required_if:type,link|url|max:500',
        ]);

        if ($request->type === 'file') {
            $uploaded = $request->file('file');
            $path     = $uploaded->store("lesson-resources/{$studySession->id}", 'public');
            $title    = $request->filled('title') ? $request->title : $uploaded->getClientOriginalName();

            LessonResource::create([
                'study_session_id' => $studySession->id,
                'type'             => 'file',
                'title'            => $title,
                'path'             => $path,
                'original_filename' => $uploaded->getClientOriginalName(),
            ]);
        } else {
            LessonResource::create([
                'study_session_id' => $studySession->id,
                'type'             => 'link',
                'title'            => $request->filled('title') ? $request->title : $request->url,
                'url'              => $request->url,
            ]);
        }

        return back()->with('success', 'Recurso adicionado com sucesso.');
    }

    public function destroy(LessonResource $resource): RedirectResponse
    {
        if ($resource->type === 'file' && $resource->path) {
            Storage::disk('public')->delete($resource->path);
        }

        $resource->delete();

        return back()->with('success', 'Recurso eliminado.');
    }

    public function download(LessonResource $resource): StreamedResponse
    {
        abort_if($resource->type !== 'file' || !$resource->path, 404);

        return Storage::disk('public')->download($resource->path, $resource->original_filename);
    }
}
