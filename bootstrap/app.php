<?php

use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->redirectUsersTo('/admin');

        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureUserRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Unique constraint violations → friendly redirect back with error
        $exceptions->renderable(function (UniqueConstraintViolationException $e, Request $request) {
            if ($request->expectsJson()) {
                return null;
            }

            $msg = $e->getMessage();
            $message = match (true) {
                str_contains($msg, 'phone') => 'Este número de telefone já está registado.',
                str_contains($msg, 'email') => 'Este email já está registado.',
                default => 'Este registo já existe (valor duplicado).',
            };

            return back()->withInput()->withErrors(['general' => $message]);
        });

        // Other DB constraint violations (foreign keys, etc.)
        $exceptions->renderable(function (QueryException $e, Request $request) {
            if ($request->expectsJson()) {
                return null;
            }

            $msg = strtolower($e->getMessage());
            $message = match (true) {
                str_contains($msg, 'foreign key constraint') && str_contains($msg, 'delete') =>
                    'Não é possível eliminar este registo porque existem dados associados.',
                str_contains($msg, 'foreign key constraint') =>
                    'Referência inválida. Verifica os dados e tenta novamente.',
                default => null,
            };

            if ($message) {
                return back()->withInput()->withErrors(['general' => $message]);
            }

            return null;
        });

        // Friendly Inertia error pages for HTTP errors
        $exceptions->respond(function (Response $response, Throwable $e, Request $request) {
            $status = $response->getStatusCode();

            if (!app()->environment(['local', 'testing'])
                && in_array($status, [403, 404, 419, 429, 500, 503])
                && !$request->expectsJson()
            ) {
                return Inertia::render('Error', [
                    'status' => $status,
                    'message' => '',
                ])->toResponse($request)->setStatusCode($status);
            }

            return $response;
        });
    })->create();
