<?php

namespace App\Models;

use App\Enums\GrupoHomogeneo;
use App\Enums\Role;
use App\Enums\StudentReadiness;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'role',
        'classroom_id', 'phone', 'whatsapp', 'alt_contact',
        'grupo_homogeneo', 'email_verified_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => Role::class,
            'grupo_homogeneo' => GrupoHomogeneo::class,
        ];
    }

    // Relationships
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class, 'student_id');
    }

    public function markedAttendances(): HasMany
    {
        return $this->hasMany(Attendance::class, 'marked_by_id');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class, 'student_id');
    }

    public function currentEnrollment(): ?Enrollment
    {
        return $this->enrollments()
            ->forYear(Setting::currentAcademicYear())
            ->active()
            ->with('classroom')
            ->first();
    }

    public function enrollmentForYear(int $year): ?Enrollment
    {
        return $this->enrollments()
            ->forYear($year)
            ->active()
            ->with('classroom')
            ->first();
    }

    // Role helpers
    public function isAdmin(): bool
    {
        return $this->role === Role::Admin;
    }

    public function isTeacher(): bool
    {
        return $this->role === Role::Teacher;
    }

    public function isStudent(): bool
    {
        return $this->role === Role::Student;
    }

    public function isManagement(): bool
    {
        return in_array($this->role, Role::managementRoles());
    }

    // Student readiness
    public function readiness(): StudentReadiness
    {
        if (!$this->classroom_id) {
            return StudentReadiness::NoClassroom;
        }

        $openSession = StudySession::where('classroom_id', $this->classroom_id)
            ->where('status', 'open')
            ->first();

        if ($openSession) {
            return StudentReadiness::SelfServiceActive;
        }

        return StudentReadiness::AttendanceReady;
    }

    public function readinessLabel(): string
    {
        return $this->readiness()->label();
    }

    // Attendance stats (scoped to a specific academic year)
    public function attendanceRatio(?int $year = null): array
    {
        if (!$this->classroom_id) {
            return ['attended' => 0, 'total' => 0, 'rate' => 0];
        }

        $year ??= Setting::currentAcademicYear();

        $sessionIds = StudySession::where('classroom_id', $this->classroom_id)
            ->whereIn('status', ['open', 'closed'])
            ->whereYear('session_date', $year)
            ->pluck('id');

        $total    = $sessionIds->count();
        $attended = $this->attendances()->whereIn('study_session_id', $sessionIds)->count();

        return [
            'attended' => $attended,
            'total'    => $total,
            'rate'     => $total > 0 ? round(($attended / $total) * 100) : 0,
        ];
    }
}
