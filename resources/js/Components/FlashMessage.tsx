import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function FlashMessage() {
  const { flash } = usePage<PageProps>().props;

  if (!flash) return null;

  return (
    <div className="space-y-2 mb-4">
      {flash.success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>{flash.success}</AlertDescription>
        </Alert>
      )}
      {flash.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{flash.error}</AlertDescription>
        </Alert>
      )}
      {flash.info && (
        <Alert className="border-blue-200 bg-blue-50 text-blue-800">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription>{flash.info}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
