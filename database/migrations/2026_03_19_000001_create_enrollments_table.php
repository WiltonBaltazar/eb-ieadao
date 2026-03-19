<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('classroom_id')->constrained('classrooms')->cascadeOnDelete();
            $table->smallInteger('academic_year')->unsigned()->notNullable();
            $table->timestamp('enrolled_at')->useCurrent();
            $table->timestamp('transferred_at')->nullable();
            $table->foreignId('enrolled_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['student_id', 'classroom_id', 'academic_year']);
            $table->index(['student_id', 'academic_year']);
            $table->index(['classroom_id', 'academic_year']);
        });

        // Backfill: for every student with a non-null classroom_id, create an enrollment row
        $currentYear = (int) DB::table('settings')->where('key', 'current_academic_year')->value('value') ?: now()->year;

        DB::table('users')
            ->where('role', 'student')
            ->whereNotNull('classroom_id')
            ->orderBy('id')
            ->each(function ($user) use ($currentYear) {
                DB::table('enrollments')->insertOrIgnore([
                    'student_id'    => $user->id,
                    'classroom_id'  => $user->classroom_id,
                    'academic_year' => $currentYear,
                    'enrolled_at'   => now(),
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrollments');
    }
};
