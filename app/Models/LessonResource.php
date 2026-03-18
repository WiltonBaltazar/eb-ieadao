<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class LessonResource extends Model
{
    protected $fillable = [
        'study_session_id', 'type', 'title', 'path', 'url', 'original_filename',
    ];

    public function studySession(): BelongsTo
    {
        return $this->belongsTo(StudySession::class);
    }

    public function getDownloadUrlAttribute(): string
    {
        return $this->type === 'file'
            ? Storage::disk('public')->url($this->path)
            : ($this->url ?? '');
    }
}
