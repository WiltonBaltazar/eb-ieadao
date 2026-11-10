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

    // Match a phone regardless of format: "+258842550315", "258842550315" and legacy
    // numbers stored without a country code before the country selector existed
    // ("842550315", or a foreign "937840720") are the same number
    public static function phoneVariants(string $phone): array
    {
        $international = (bool) preg_match('/^\s*(\+|00)/', $phone);

        $digits = preg_replace('/\D/', '', $phone);
        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        if ($digits === '') {
            return [trim($phone)];
        }

        // "258258842550315": country code typed again after selecting +258
        $digits = self::dropRepeatedCountryCode($digits);

        $variants = [trim($phone), $digits, '+' . $digits];

        if ($international || (strlen($digits) === 12 && str_starts_with($digits, '258'))) {
            // A legacy number only matches the country it belongs to: Mozambican-looking
            // numbers only under +258, anything else only under other codes, so
            // "+258937840720" does not match the Portuguese legacy "937840720"
            [$code, $national] = self::splitCountryCode($digits);
            if ($code !== null && self::looksMozambican($national) === ($code === '258')) {
                $variants[] = $national;
            }
        } elseif (self::looksMozambican($digits)) {
            $variants[] = '258' . $digits;
            $variants[] = '+258' . $digits;
        }

        return array_values(array_unique($variants));
    }

    // Mozambican mobiles: 9 digits starting with 8 (82–87)
    private static function looksMozambican(string $national): bool
    {
        return (bool) preg_match('/^8\d{8}$/', $national);
    }

    // "351937840720" -> ["351", "937840720"]; [null, digits] when no known code matches
    private static function splitCountryCode(string $digits): array
    {
        $maxLengths = self::phoneMaxLengths();

        foreach ([3, 2, 1] as $codeLength) {
            $code = substr($digits, 0, $codeLength);
            if (isset($maxLengths[$code])) {
                return [$code, substr($digits, $codeLength)];
            }
        }

        return [null, $digits];
    }

    // Shared with the country selector (resources/js/lib/phone-max-lengths.json)
    private static function phoneMaxLengths(): array
    {
        static $maxLengths = null;

        return $maxLengths ??= json_decode(file_get_contents(resource_path('js/lib/phone-max-lengths.json')), true);
    }

    // Drop a country code typed again after selecting it: "+258258842550315" -> "+258842550315"
    public static function normalizePhone(string $phone): string
    {
        $phone = trim($phone);

        if (!preg_match('/^\+(\d+)$/', $phone, $m)) {
            return $phone;
        }

        return '+' . self::dropRepeatedCountryCode($m[1]);
    }

    // Only drops the code when the number is too long for that country but fits
    // without it, so real numbers starting with the code (French "+33 3…") are kept.
    private static function dropRepeatedCountryCode(string $digits): string
    {
        $maxLengths = self::phoneMaxLengths();

        foreach ([3, 2, 1] as $codeLength) {
            $code = substr($digits, 0, $codeLength);
            if (!isset($maxLengths[$code])) {
                continue;
            }

            $national = substr($digits, $codeLength);
            $max = $maxLengths[$code];

            return str_starts_with($national, $code)
                && strlen($national) > $max
                && strlen($national) - $codeLength <= $max
                ? $code . substr($national, $codeLength)
                : $digits;
        }

        return $digits;
    }

    public function scopeMatchingPhone($query, string $phone)
    {
        return $query->whereIn('phone', self::phoneVariants($phone));
    }

    // Attendance stats (scoped to a specific academic year)
    public function attendanceRatio(?int $year = null): array
    {
        if (!$this->classroom_id) {
            return ['attended' => 0, 'total' => 0, 'rate' => 0];
        }

        $requiredIds = $this->requiredSessionsQuery($year)->pluck('id');

        // Attended: only sessions from enrollment date onward (ignore admin-added pre-enrollment entries)
        $attendedIds = $this->attendances()
            ->whereIn('study_session_id', $requiredIds)
            ->pluck('study_session_id');
        $attended = $attendedIds->count();

        $total = $requiredIds->count();

        $missed = $total - $attended;

        return [
            'attended' => $attended,
            'missed'   => $missed,
            'total'    => $total,
            'rate'     => $total > 0 ? round(($attended / $total) * 100) : 0,
        ];
    }

    // Streaks of lessons attended consecutively without missing one:
    // 'current' counts back from the most recent lesson, 'best' is the longest run in the year
    public function attendanceStreak(?int $year = null): array
    {
        if (!$this->classroom_id) {
            return ['current' => 0, 'best' => 0];
        }

        $sessions = $this->requiredSessionsQuery($year)
            ->orderByDesc('session_date')
            ->orderByDesc('id')
            ->get(['id', 'status']);

        $attendedIds = $this->attendances()
            ->whereIn('study_session_id', $sessions->pluck('id'))
            ->pluck('study_session_id')
            ->flip();

        $current = 0;
        $best = 0;
        $run = 0;
        $currentEnded = false;

        foreach ($sessions as $index => $session) {
            if ($attendedIds->has($session->id)) {
                $run++;
                $best = max($best, $run);
                continue;
            }

            // The latest session may still be open (check-in in progress) — don't break the streak for it
            if ($index === 0 && $session->isOpen()) {
                continue;
            }

            if (!$currentEnded) {
                $current = $run;
                $currentEnded = true;
            }
            $run = 0;
        }

        if (!$currentEnded) {
            $current = $run;
        }

        return ['current' => $current, 'best' => $best];
    }

    // Sessions the student was expected to attend: from enrollment date onward in the given year
    private function requiredSessionsQuery(?int $year = null)
    {
        $year ??= Setting::currentAcademicYear();

        // Total: sessions from enrollment date onward only
        $enrollment = $this->enrollments()
            ->where('classroom_id', $this->classroom_id)
            ->forYear($year)
            ->active()
            ->first();

        $fromDate = $enrollment?->enrolled_at;

        // If no enrollment date, use the date of the first session attended this year
        if (!$fromDate) {
            $firstAttended = $this->attendances()
                ->join('study_sessions', 'attendances.study_session_id', '=', 'study_sessions.id')
                ->where('study_sessions.classroom_id', $this->classroom_id)
                ->whereYear('study_sessions.session_date', $year)
                ->min('study_sessions.session_date');

            $fromDate = $firstAttended ? \Carbon\Carbon::parse($firstAttended) : null;
        }

        return StudySession::where('classroom_id', $this->classroom_id)
            ->whereIn('status', ['open', 'closed'])
            ->whereYear('session_date', $year)
            ->when($fromDate, fn ($q) => $q->where('session_date', '>=', $fromDate->toDateString()));
    }
}
