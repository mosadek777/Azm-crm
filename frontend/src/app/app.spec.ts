import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  it('is a bare shell holding only the router outlet', async () => {
    // The CLI's generated test asserted the scaffold splash page's <h1>. That
    // template was replaced in step 1: App renders nothing of its own, so that
    // the auth-layout / main-layout split decides the whole page.
    TestBed.configureTestingModule({ providers: [provideRouter([])] });

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('router-outlet')).not.toBeNull();
    expect(root.querySelector('h1')).toBeNull();
  });
});
