/**
 * Finance Support home — the launcher.
 *
 * Available modules are real, working tiles. Planned modules are listed as a
 * roadmap: they are deliberately not links or buttons, so nothing in the UI
 * pretends to work before it is built.
 */

import { Link } from 'react-router-dom';

import { AVAILABLE_MODULES, PLANNED_MODULES, SYSTEM, type ModuleGroup, type PlannedModule } from './modules';

export function HomePage() {
  const roadmap = groupByArea(PLANNED_MODULES);

  return (
    <div className="home">
      <header className="home__intro">
        <p className="home__eyebrow">{SYSTEM.name}</p>
        <h1 className="home__title">{SYSTEM.tagline}</h1>
        <p className="home__lede">
          One workspace for the finance function. Each area is a module with its own data and its own documents;
          {' '}{AVAILABLE_MODULES.length === 1 ? 'the first one is' : 'those'} ready to use below.
        </p>
      </header>

      <section className="home__section" aria-labelledby="available-heading">
        <h2 className="home__section-title" id="available-heading">
          Available now
          <span className="badge badge--accent">{AVAILABLE_MODULES.length}</span>
        </h2>

        <div className="tile-grid">
          {AVAILABLE_MODULES.map((m) => (
            <article className="tile" key={m.id}>
              <div className="tile__head">
                <span className="tile__mark" aria-hidden>{m.mark}</span>
                <div>
                  <h3 className="tile__name">{m.name}</h3>
                  {/* The group is only worth showing when it adds information. */}
                  {m.group !== m.name && <p className="tile__group">{m.group}</p>}
                </div>
              </div>

              <p className="tile__description">{m.description}</p>

              {m.HomeSummary && <m.HomeSummary />}

              <div className="tile__footer">
                <Link className="btn btn--primary btn--sm" to={`${m.basePath}/${m.pages[0].path}`}>
                  Open {m.name}
                </Link>
                <span className="tile__pages">
                  {m.pages.map((p) => p.label).join(' · ')}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home__section" aria-labelledby="roadmap-heading">
        <h2 className="home__section-title" id="roadmap-heading">
          Planned
          <span className="badge badge--neutral">{PLANNED_MODULES.length}</span>
        </h2>
        <p className="home__section-note">
          The rest of the finance and accounting system. These are not built yet — they are listed so the shape of
          Finance Support is clear, and each becomes a module folder plus one registry entry.
        </p>

        <div className="roadmap">
          {roadmap.map(([group, modules]) => (
            <div className="roadmap__group" key={group}>
              <h3 className="roadmap__group-title">{group}</h3>
              <ul className="roadmap__list">
                {modules.map((m) => (
                  <li className="roadmap__item" key={m.id}>
                    <span className="roadmap__name">{m.name}</span>
                    <span className="roadmap__description">{m.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function groupByArea(modules: PlannedModule[]): Array<[ModuleGroup, PlannedModule[]]> {
  const map = new Map<ModuleGroup, PlannedModule[]>();
  for (const m of modules) {
    const list = map.get(m.group) ?? [];
    list.push(m);
    map.set(m.group, list);
  }
  return [...map.entries()];
}
