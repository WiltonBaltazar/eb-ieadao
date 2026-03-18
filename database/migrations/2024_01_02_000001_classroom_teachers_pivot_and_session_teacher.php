<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Pivot: classroom ↔ teachers (many-to-many)
        Schema::create('classroom_teacher', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('classroom_id');
            $table->unsignedBigInteger('user_id');
            $table->timestamps();

            $table->unique(['classroom_id', 'user_id']);
            $table->foreign('classroom_id')->references('id')->on('classrooms')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        // 2. Migrate existing single teacher_id → pivot
        DB::table('classrooms')
            ->whereNotNull('teacher_id')
            ->get()
            ->each(fn ($c) => DB::table('classroom_teacher')->insert([
                'classroom_id' => $c->id,
                'user_id'      => $c->teacher_id,
                'created_at'   => now(),
                'updated_at'   => now(),
            ]));

        // 3. Drop FK (MySQL only) then drop column
        if (config('database.default') !== 'sqlite') {
            Schema::table('classrooms', function (Blueprint $table) {
                $table->dropForeignIfExists(['teacher_id']);
            });
        }
        Schema::table('classrooms', function (Blueprint $table) {
            $table->dropColumn('teacher_id');
        });

        // 4. Add teacher_id to study_sessions
        Schema::table('study_sessions', function (Blueprint $table) {
            $table->unsignedBigInteger('teacher_id')->nullable()->after('classroom_id');
        });

        if (config('database.default') !== 'sqlite') {
            Schema::table('study_sessions', function (Blueprint $table) {
                $table->foreign('teacher_id')->references('id')->on('users')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::table('study_sessions', function (Blueprint $table) {
            if (config('database.default') !== 'sqlite') {
                $table->dropForeignIfExists(['teacher_id']);
            }
            $table->dropColumn('teacher_id');
        });

        Schema::table('classrooms', function (Blueprint $table) {
            $table->unsignedBigInteger('teacher_id')->nullable();
        });

        Schema::dropIfExists('classroom_teacher');
    }
};
