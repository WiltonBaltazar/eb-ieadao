<?php

namespace App\Models;

use App\Enums\AttendanceLocation;
use App\Enums\CheckInMethod;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'study_session_id', 'student_id', 'marked_by_id',
        'check_in_method', 'location', 'checked_in_at',
    ];

    protected $casts = [
        'checked_in_at' => 'datetime',
        'check_in_method' => CheckInMethod::class,
        'location' => AttendanceLocation::class,
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(StudySession::class, 'study_session_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function markedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'marked_by_id');
    }
}
