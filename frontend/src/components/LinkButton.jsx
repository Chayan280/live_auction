import React from 'react';

export function LinkButton({ href, children, primary = false }) {
  return <a className={`button ${primary ? 'button-primary' : ''}`} href={`#${href}`}>{children}</a>;
}
