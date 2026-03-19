<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('curriculum_stage_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('curriculum_enrollment_id')->constrained('curriculum_enrollments')->cascadeOnDelete();
            $table->foreignId('stage_id')->constrained('curriculum_stages')->cascadeOnDelete();
            $table->foreignId('classroom_id')->nullable()->constrained('classrooms')->nullOnDelete();
            $table->timestamp('entered_at')->useCurrent();
            $table->timestamp('left_at')->nullable();
            $table->foreignId('advanced_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['curriculum_enrollment_id', 'stage_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('curriculum_stage_history');
    }
};
