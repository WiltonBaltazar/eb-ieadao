<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('study_sessions')) {
            return;
        }

        Schema::create('study_sessions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('classroom_id');
            $table->string('title');
            $table->date('session_date');
            $table->string('status')->default('draft');
            $table->string('lesson_type')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('attendance_opened_at')->nullable();
            $table->timestamp('attendance_closed_at')->nullable();
            $table->string('check_in_code')->nullable();
            $table->timestamp('check_in_code_generated_at')->nullable();
            $table->timestamp('check_in_code_expires_at')->nullable();
            $table->timestamps();

            $table->foreign('classroom_id')->references('id')->on('classrooms')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('study_sessions');
    }
};
