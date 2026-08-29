/**
 * Print targets.
 *
 * The app carries two printable documents in the DOM: the detailed cost sheet
 * and the one-page Costing & Pricing Card. A data attribute on <body> decides
 * which one the browser prints (see styles/print.css).
 */

export type PrintTarget = 'sheet' | 'card';

export function printDocument(target: PrintTarget): void {
  document.body.dataset.print = target;

  const restore = () => {
    document.body.dataset.print = 'sheet';
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);

  window.print();
  // Safari/Firefox may not fire afterprint reliably - restore defensively.
  setTimeout(restore, 1000);
}
