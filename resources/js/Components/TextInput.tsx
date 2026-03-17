import { forwardRef, useEffect, InputHTMLAttributes, useRef } from 'react';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
    isFocused?: boolean;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
    ({ className = '', type = 'text', isFocused = false, ...props }, ref) => {
        const inputRef = useRef<HTMLInputElement>(null);
        const resolvedRef = (ref as React.RefObject<HTMLInputElement>) || inputRef;

        useEffect(() => {
            if (isFocused && resolvedRef.current) {
                resolvedRef.current.focus();
            }
        }, [isFocused, resolvedRef]);

        return (
            <input
                {...props}
                type={type}
                className={
                    'rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ' +
                    className
                }
                ref={resolvedRef}
            />
        );
    }
);
TextInput.displayName = 'TextInput';

export default TextInput;
