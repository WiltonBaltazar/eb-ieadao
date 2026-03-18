<?php

use App\Http\Controllers\Admin\ClassroomsController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\ReportsController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\StudySessionsController;
use App\Http\Controllers\Admin\UsersController;
use App\Http\Controllers\CheckInController;
use App\Http\Controllers\RegistrationController;
use App\Http\Controllers\SessionQrController;
use App\Http\Controllers\StudentAttendanceController;
use App\Http\Controllers\StudentAuthController;
use App\Http\Controllers\StudentProfileController;
use Illuminate\Support\Facades\Route;

// Root redirect
Route::get('/', fn () => redirect()->route('student.login'));

// Student Auth
Route::get('/entrar', [StudentAuthController::class, 'showLogin'])->name('student.login');
Route::post('/entrar', [StudentAuthController::class, 'login'])->name('student.login.submit');
Route::post('/sair', [StudentAuthController::class, 'logout'])->name('student.logout');

// Public QR Check-in
Route::get('/acesso-sessao/{studySession}', [CheckInController::class, 'show'])->name('check-in.show');
Route::post('/check-in/{studySession}', [CheckInController::class, 'store'])->name('check-in.store');

// Public Student Registration
Route::get('/registar', [RegistrationController::class, 'showGeneral'])->name('registration.general');
Route::post('/registar', [RegistrationController::class, 'storeGeneral'])->name('registration.general.store');
Route::get('/registar/{studySession}', [RegistrationController::class, 'show'])->name('registration.show');
Route::post('/registar/{studySession}', [RegistrationController::class, 'store'])->name('registration.store');

// Admin/Teacher Login (Breeze)
require __DIR__.'/auth.php';

// Student Routes
Route::middleware(['role:student,teacher'])->group(function () {
    Route::get('/meu-perfil', [StudentProfileController::class, 'show'])->name('student.profile');
    Route::get('/minhas-presencas', [StudentAttendanceController::class, 'index'])->name('student.attendances');
    Route::get('/perfil/editar', [StudentProfileController::class, 'edit'])->name('student.profile.edit');
    Route::put('/perfil/editar', [StudentProfileController::class, 'update'])->name('student.profile.update');
});

// Admin/Teacher Routes
Route::middleware(['role:admin,teacher'])->prefix('admin')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('admin.dashboard');
    Route::get('/ranking', [DashboardController::class, 'attendanceRanking'])->name('admin.ranking');

    // Profile
    Route::get('/perfil', [\App\Http\Controllers\Admin\AdminProfileController::class, 'edit'])->name('admin.profile.edit');
    Route::put('/perfil', [\App\Http\Controllers\Admin\AdminProfileController::class, 'update'])->name('admin.profile.update');

    // Users
    Route::get('/utilizadores', [UsersController::class, 'index'])->name('admin.users.index');
    Route::post('/utilizadores', [UsersController::class, 'store'])->name('admin.users.store');
    Route::post('/utilizadores/bulk-destroy', [UsersController::class, 'bulkDestroy'])->name('admin.users.bulk-destroy');
    Route::get('/utilizadores/{user}', [UsersController::class, 'show'])->name('admin.users.show');
    Route::put('/utilizadores/{user}', [UsersController::class, 'update'])->name('admin.users.update');
    Route::delete('/utilizadores/{user}', [UsersController::class, 'destroy'])->name('admin.users.destroy');

    // Classrooms
    Route::get('/turmas', [ClassroomsController::class, 'index'])->name('admin.classrooms.index');
    Route::post('/turmas', [ClassroomsController::class, 'store'])->name('admin.classrooms.store');
    Route::post('/turmas/bulk-destroy', [ClassroomsController::class, 'bulkDestroy'])->name('admin.classrooms.bulk-destroy');
    Route::put('/turmas/{classroom}', [ClassroomsController::class, 'update'])->name('admin.classrooms.update');
    Route::delete('/turmas/{classroom}', [ClassroomsController::class, 'destroy'])->name('admin.classrooms.destroy');
    Route::get('/turmas/{classroom}/alunos', [ClassroomsController::class, 'students'])->name('admin.classrooms.students');

    // Study Sessions
    Route::get('/sessoes', [StudySessionsController::class, 'index'])->name('admin.sessions.index');
    Route::post('/sessoes', [StudySessionsController::class, 'store'])->name('admin.sessions.store');
    Route::post('/sessoes/bulk-destroy', [StudySessionsController::class, 'bulkDestroy'])->name('admin.sessions.bulk-destroy');
    Route::put('/sessoes/{studySession}', [StudySessionsController::class, 'update'])->name('admin.sessions.update');
    Route::delete('/sessoes/{studySession}', [StudySessionsController::class, 'destroy'])->name('admin.sessions.destroy');
    Route::post('/sessoes/{studySession}/abrir', [StudySessionsController::class, 'open'])->name('admin.sessions.open');
    Route::post('/sessoes/{studySession}/fechar', [StudySessionsController::class, 'close'])->name('admin.sessions.close');
    Route::post('/sessoes/{studySession}/regenerar-codigo', [StudySessionsController::class, 'regenerateCode'])->name('admin.sessions.regenerate');
    Route::post('/sessoes/{studySession}/marcar-presente', [StudySessionsController::class, 'markPresent'])->name('admin.sessions.mark-present');
    Route::get('/sessoes/{studySession}/presencas', [StudySessionsController::class, 'attendance'])->name('admin.sessions.attendance');
    Route::get('/sessoes/{studySession}/exportar-excel', [StudySessionsController::class, 'exportExcel'])->name('admin.sessions.export-excel');
    Route::post('/sessoes/{studySession}/registar-e-marcar', [StudySessionsController::class, 'registerAndMark'])->name('admin.sessions.register-and-mark');
    Route::post('/presencas/bulk-destroy', [StudySessionsController::class, 'bulkDestroyAttendances'])->name('admin.attendances.bulk-destroy');
    Route::delete('/presencas/{attendance}', [StudySessionsController::class, 'removeAttendance'])->name('admin.attendances.destroy');

    // Reports
    Route::get('/relatorios', [ReportsController::class, 'index'])->name('admin.reports.index');
    Route::get('/relatorios/chart-data', [ReportsController::class, 'chartData'])->name('admin.reports.chart-data');
    Route::get('/relatorios/registos', [ReportsController::class, 'registros'])->name('admin.reports.registros');
    Route::get('/relatorios/exportar', [ReportsController::class, 'exportCsv'])->name('admin.reports.export');
    Route::get('/relatorios/turma/{classroom}/exportar-excel', [ReportsController::class, 'exportClassroomExcel'])->name('admin.reports.export-classroom');
});

// Admin only settings
Route::middleware(['role:admin'])->group(function () {
    Route::get('/admin/definicoes', [SettingsController::class, 'index'])->name('admin.settings.index');
    Route::put('/admin/definicoes', [SettingsController::class, 'update'])->name('admin.settings.update');
});

// QR Display (public)
Route::get('/qr/sessao/{studySession}', [SessionQrController::class, 'show'])->name('sessions.qr');
