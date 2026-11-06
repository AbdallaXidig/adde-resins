import { useId } from "react";

type Base = { label: string; name: string; error?: string; required?: boolean; hint?: string; requiredLabel?: string };

function Wrapper({ label, id, error, required, hint, children }: { label: string; id: string; error?: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span aria-hidden className="ms-0.5 text-burgundy">*</span>}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}

const aria = (id: string, error?: string, hint?: string) => ({
  "aria-invalid": error ? (true as const) : undefined,
  "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
});

export function TextField({ label, name, error, required, hint, ...rest }: Base & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Wrapper {...{ label, id, error, required, hint }}>
      <input id={id} name={name} required={required} className="field" {...aria(id, error, hint)} {...rest} />
    </Wrapper>
  );
}

export function SelectField({ label, name, error, required, hint, children, ...rest }: Base & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Wrapper {...{ label, id, error, required, hint }}>
      <select id={id} name={name} required={required} className="field" {...aria(id, error, hint)} {...rest}>{children}</select>
    </Wrapper>
  );
}

export function TextAreaField({ label, name, error, required, hint, ...rest }: Base & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Wrapper {...{ label, id, error, required, hint }}>
      <textarea id={id} name={name} required={required} rows={4} className="field" {...aria(id, error, hint)} {...rest} />
    </Wrapper>
  );
}

/** Off-screen trap field for bots. Hidden from people and assistive technology. */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -start-[9999px] size-0 overflow-hidden">
      <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
    </div>
  );
}
