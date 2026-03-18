<?php

namespace App\Models;

use App\Enums\StudySessionStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;


class StudySession extends Model
{
    use HasFactory;

    protected $fillable = [
        'classroom_id', 'teacher_id', 'title', 'session_date', 'status',
        'lesson_type', 'notes', 'attendance_opened_at',
        'attendance_closed_at', 'check_in_code',
        'check_in_code_generated_at', 'check_in_code_expires_at',
    ];

    protected $casts = [
        'session_date' => 'date',
        'attendance_opened_at' => 'datetime',
        'attendance_closed_at' => 'datetime',
        'check_in_code_generated_at' => 'datetime',
        'check_in_code_expires_at' => 'datetime',
        'status' => StudySessionStatus::class,
    ];

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function isOpen(): bool
    {
        return $this->status === StudySessionStatus::Open;
    }

    public function checkInUrl(): string
    {
        return route('check-in.show', $this);
    }
}
