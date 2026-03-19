<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('curriculum_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('curriculum_id')->constrained('curricula')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('current_stage_id')->nullable()->constrained('curriculum_stages')->nullOnDelete();
            $table->foreignId('current_classroom_id')->nullable()->constrained('classrooms')->nullOnDelete();
            $table->boolean('baptized')->default(false);
            $table->date('baptized_at')->nullable();
            $table->timestamp('enrolled_at')->useCurrent();
            $table->foreignId('enrolled_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['curriculum_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('curriculum_enrollments');
    }
};
