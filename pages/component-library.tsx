import { useState } from 'react';
import {
  PageShell,
  PageMeta,
  AppHeader,
  Heading,
  Label,
  Button,
  LinkButton,
  TextInput,
  Field,
  FieldActions,
  ProgressBar,
  Player,
  BlinkImage,
  TrackSection,
  PlayableTrackRow,
  AdminTrackRow,
  formatTime,
  type TrackRef,
} from '../components';
import styles from './ComponentLibrary.module.css';

const demoTracks: TrackRef[] = [
  { id: 'demo/first-track', title: 'First Track', section: 'Demo', duration: 183 },
  { id: 'demo/second-track', title: 'Second Track', section: 'Demo', duration: 247 },
];

function Entry({ name, notes, children }: { name: string; notes?: string; children: React.ReactNode }) {
  return (
    <section className={styles.entry}>
      <header className={styles.entryHeader}>
        <Heading level={2}>{name}</Heading>
        {notes && <p className={styles.notes}>{notes}</p>}
      </header>
      <div className={styles.preview}>{children}</div>
    </section>
  );
}

export default function ComponentLibrary() {
  const [active, setActive] = useState<string | null>(null);
  const [progress, setProgress] = useState(42);

  return (
    <>
      <PageMeta title="component library" description="design system v1" path="/component-library" />
      <PageShell width="medium">
        <AppHeader
          left={<Label>component library</Label>}
          right={<span className={styles.meta}>design system v1</span>}
        />

        <Entry name="Design tokens" notes="CSS variables in app/globals.css; reference via var(--color-*), var(--space-*), var(--text-*).">
          <div className={styles.swatchRow}>
            {['--color-bg','--color-bg-surface','--color-bg-elevated','--color-border','--color-fg','--color-fg-muted','--color-fg-subtle','--color-fg-dim','--color-accent','--color-danger'].map((name) => (
              <div key={name} className={styles.swatch}>
                <div className={styles.swatchChip} style={{ background: `var(${name})` }} />
                <code>{name}</code>
              </div>
            ))}
          </div>
        </Entry>

        <Entry name="Heading" notes="3 levels: level={1|2|3}. Upper-case, letter-spaced.">
          <Heading level={1}>Heading level 1</Heading>
          <Heading level={2}>Heading level 2</Heading>
          <Heading level={3}>Heading level 3</Heading>
          <br />
          <Label>Label (inline)</Label>
        </Entry>

        <Entry name="Button" notes="variant={primary|secondary|ghost|danger}, size={sm|md|lg}.">
          <div className={styles.buttonGrid}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" disabled>Disabled</Button>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="md">Medium</Button>
            <Button variant="primary" size="lg">Large</Button>
            <LinkButton variant="primary" href="#">Link as Button</LinkButton>
          </div>
        </Entry>

        <Entry name="TextInput + Field" notes="Use Field for label+control rows in forms.">
          <form onSubmit={(e) => e.preventDefault()}>
            <Field label="Title"><TextInput placeholder="Track title" /></Field>
            <Field label="Section"><TextInput placeholder="Disc 1" /></Field>
            <Field label="File"><TextInput type="file" /></Field>
            <FieldActions>
              <Button type="button">Submit</Button>
              <Button type="button" variant="ghost">Cancel</Button>
            </FieldActions>
          </form>
        </Entry>

        <Entry name="ProgressBar" notes="value: 0–100.">
          <div className={styles.progressDemo}>
            <ProgressBar value={progress} />
            <div className={styles.progressActions}>
              <Button size="sm" variant="secondary" onClick={() => setProgress(Math.max(0, progress - 10))}>-10</Button>
              <span className={styles.meta}>{progress}%</span>
              <Button size="sm" variant="secondary" onClick={() => setProgress(Math.min(100, progress + 10))}>+10</Button>
            </div>
          </div>
        </Entry>

        <Entry name="BlinkImage" notes="144 BPM blink; used on main page.">
          <BlinkImage src="/assets/2025.png" alt="2025" width={30} />
        </Entry>

        <Entry name="TrackSection + PlayableTrackRow" notes="Studio-style list with click-to-play indicator.">
          <TrackSection title="Demo">
            {demoTracks.map((t) => (
              <PlayableTrackRow
                key={t.id}
                track={t}
                active={active === t.id}
                playing={active === t.id}
                onClick={() => setActive(active === t.id ? null : t.id)}
              />
            ))}
          </TrackSection>
        </Entry>

        <Entry name="AdminTrackRow" notes="Admin row with id + duration + actions slot.">
          <TrackSection title="Demo">
            {demoTracks.map((t) => (
              <AdminTrackRow
                key={t.id}
                track={t}
                actions={
                  <>
                    <Button size="sm" variant="secondary">edit</Button>
                    <Button size="sm" variant="danger">delete</Button>
                  </>
                }
              />
            ))}
          </TrackSection>
        </Entry>

        <Entry name="formatTime" notes="Utility: seconds → M:SS.">
          <code className={styles.code}>
            formatTime(75) → &quot;{formatTime(75)}&quot;<br />
            formatTime(3600) → &quot;{formatTime(3600)}&quot;<br />
            formatTime(8.2) → &quot;{formatTime(8.2)}&quot;
          </code>
        </Entry>

        <Entry name="Player" notes="Fixed bottom playbar. Renders at the bottom of this page (scroll down).">
          <p className={styles.meta}>(shown in fixed position below)</p>
        </Entry>

        <div className={styles.spacer} />
      </PageShell>

      <Player title="preview: Demo Track" progress={progress * 1.8} duration={180} />
    </>
  );
}
