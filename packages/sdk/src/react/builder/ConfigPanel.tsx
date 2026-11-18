import { useId, type ReactNode } from 'react';
import {
  changeWidgetType,
  setAggregation,
  setDimension,
  setDrillDown,
  setMeasure,
  setPageSize,
  setRowLimit,
  setSortOrder,
} from '../../core/config/edit-widget';
import { MAX_ROWS } from '../../core/config/schema';
import { emitsFilters, emittedField } from '../../core/filter-store';
import type { FieldCatalog } from '../../core/query-client';
import type {
  Aggregation,
  DashKitError,
  DimensionField,
  MeasureField,
  Query,
  WidgetConfig,
  WidgetType,
} from '../../core/types';
import { widgetRegistry } from '../widgets/registry';
import { CrossIcon } from './icons';

const widgetTypes = Object.keys(widgetRegistry) as WidgetType[];

const aggregationLabels: Record<Aggregation, string> = {
  sum: 'Sum',
  avg: 'Average',
  min: 'Minimum',
  max: 'Maximum',
  count: 'Count',
};

type SortOrder = NonNullable<Query['orderBy']>[number];

const sortValue = ({ field, direction }: SortOrder) => `${direction}:${field}`;

/** Every way to sort by one of the widget's own columns, worded for people. */
function sortChoices({ query }: WidgetConfig, catalog: FieldCatalog) {
  const labelOf = (name: string) =>
    [...catalog.dimensions, ...catalog.measures].find((field) => field.name === name)?.label ??
    name;
  const choice = (field: string, direction: SortOrder['direction'], label: string) => ({
    value: sortValue({ field, direction }),
    order: { field, direction },
    label,
  });
  return [
    ...(query.dimensions ?? []).flatMap((field) => {
      const [up, down] = field === 'year' ? ['oldest first', 'newest first'] : ['A to Z', 'Z to A'];
      return [
        choice(field, 'asc', `${labelOf(field)}, ${up}`),
        choice(field, 'desc', `${labelOf(field)}, ${down}`),
      ];
    }),
    // Sorting refers to a measure by its alias when it has one.
    ...query.measures.flatMap(({ field, alias }) => [
      choice(alias ?? field, 'desc', `${labelOf(field)}, highest first`),
      choice(alias ?? field, 'asc', `${labelOf(field)}, lowest first`),
    ]),
  ];
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="dk-field">
      <span className="dk-field-label">{label}</span>
      {children}
    </label>
  );
}

interface ConfigPanelProps {
  id: string;
  widget: WidgetConfig;
  catalog: { value?: FieldCatalog | undefined; error?: DashKitError | undefined };
  latestYear: number | undefined;
  onChange: (widget: WidgetConfig) => void;
  onClose: () => void;
}

/**
 * Edits one widget of the draft. Every change goes straight into the draft, so the widget on the
 * grid shows it at once. Measures and dimensions come from `/meta`, so only fields the signed-in
 * user may query are offered.
 */
export function ConfigPanel({
  id,
  widget,
  catalog,
  latestYear,
  onChange,
  onClose,
}: ConfigPanelProps) {
  const headingId = useId();
  const fields = new Set(widgetRegistry[widget.type].configFields);
  const { value: fieldCatalog, error } = catalog;
  const [measure] = widget.query.measures;
  const measureInfo = fieldCatalog?.measures.find(({ name }) => name === measure?.field);
  const sortOrder = widget.query.orderBy?.[0];
  const sorts = fieldCatalog ? sortChoices(widget, fieldCatalog) : [];

  return (
    <section
      id={id}
      className="dk-config-panel"
      aria-labelledby={headingId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div className="dk-config-header">
        <h3 id={headingId} className="dk-config-title">
          Widget settings
        </h3>
        <button
          type="button"
          className="dk-icon-button"
          aria-label="Close widget settings"
          title="Close"
          onClick={onClose}
        >
          <CrossIcon />
        </button>
      </div>

      <Field label="Title">
        <input
          className="dk-input"
          value={widget.title}
          // Focused on opening, so keyboard users start where the settings are.
          autoFocus
          onChange={(event) => onChange({ ...widget, title: event.currentTarget.value })}
        />
      </Field>

      <Field label="Type">
        <select
          className="dk-input"
          value={widget.type}
          onChange={(event) => {
            const type = event.currentTarget.value as WidgetType;
            onChange(
              changeWidgetType(widget, type, widgetRegistry[type].starter.query, latestYear),
            );
          }}
        >
          {widgetTypes.map((type) => (
            <option key={type} value={type}>
              {widgetRegistry[type].label}
            </option>
          ))}
        </select>
      </Field>

      {error && (
        <p className="dk-config-note" role="alert">
          The fields could not be loaded, so only the title and type can be changed. {error.message}
        </p>
      )}
      {!error && !fieldCatalog && (
        <p className="dk-config-note" role="status">
          Loading fields…
        </p>
      )}

      {fieldCatalog && fields.has('measure') && (
        <Field label="Measure">
          <select
            className="dk-input"
            value={measure?.field ?? ''}
            onChange={(event) => {
              const field = event.currentTarget.value as MeasureField;
              const info = fieldCatalog.measures.find(({ name }) => name === field);
              if (info) onChange(setMeasure(widget, field, info.defaultAgg));
            }}
          >
            {measure && !fieldCatalog.measures.some(({ name }) => name === measure.field) && (
              // Outside the user's column scope: the API refuses it and does not list its label.
              <option value={measure.field} disabled>
                Not available to you
              </option>
            )}
            {fieldCatalog.measures.map(({ name, label }) => (
              <option key={name} value={name}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      )}

      {fieldCatalog && fields.has('aggregation') && (
        <Field label="Aggregation">
          <select
            className="dk-input"
            value={measure?.agg ?? measureInfo?.defaultAgg ?? ''}
            onChange={(event) =>
              onChange(setAggregation(widget, event.currentTarget.value as Aggregation))
            }
          >
            {fieldCatalog.aggregations.map((agg) => (
              <option key={agg} value={agg}>
                {aggregationLabels[agg]}
              </option>
            ))}
          </select>
        </Field>
      )}

      {fieldCatalog && fields.has('dimension') && (
        <Field label="Group by">
          <select
            className="dk-input"
            value={widget.query.dimensions?.[0] ?? ''}
            onChange={(event) =>
              onChange(
                setDimension(widget, event.currentTarget.value as DimensionField, latestYear),
              )
            }
          >
            {fieldCatalog.dimensions.map(({ name, label }) => (
              <option key={name} value={name}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      )}

      {fieldCatalog && fields.has('sort') && (
        <Field label="Sort">
          <select
            className="dk-input"
            value={sortOrder ? sortValue(sortOrder) : ''}
            onChange={(event) => {
              const { value } = event.currentTarget;
              onChange(setSortOrder(widget, sorts.find((choice) => choice.value === value)?.order));
            }}
          >
            <option value="">Unsorted</option>
            {sorts.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      )}

      {fields.has('limit') && (
        <Field label="Row limit">
          <input
            className="dk-input"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_ROWS}
            placeholder="None"
            value={widget.query.limit ?? ''}
            onChange={(event) => {
              const limit = Number.parseInt(event.currentTarget.value, 10);
              onChange(setRowLimit(widget, limit >= 1 ? Math.min(limit, MAX_ROWS) : undefined));
            }}
          />
        </Field>
      )}

      {fields.has('pageSize') && (
        <Field label="Rows per page">
          <input
            className="dk-input"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_ROWS}
            placeholder="All"
            value={widget.options?.pageSize ?? ''}
            onChange={(event) => {
              const size = Number.parseInt(event.currentTarget.value, 10);
              onChange(setPageSize(widget, size >= 1 ? Math.min(size, MAX_ROWS) : undefined));
            }}
          />
        </Field>
      )}

      {fields.has('orientation') && (
        <Field label="Bars">
          <select
            className="dk-input"
            value={widget.options?.orientation ?? 'vertical'}
            onChange={(event) => {
              const orientation = event.currentTarget.value as 'vertical' | 'horizontal';
              onChange({ ...widget, options: { ...widget.options, orientation } });
            }}
          >
            <option value="vertical">Vertical</option>
            <option value="horizontal">Horizontal</option>
          </select>
        </Field>
      )}

      {fieldCatalog && fields.has('drillDown') && emittedField(widget) && (
        <Field label="Drill down to">
          <select
            className="dk-input"
            value={widget.drillDown ?? ''}
            onChange={(event) => {
              const { value } = event.currentTarget;
              onChange(setDrillDown(widget, value ? (value as DimensionField) : undefined));
            }}
          >
            <option value="">Nothing</option>
            {fieldCatalog.dimensions
              .filter(({ name }) => name !== emittedField(widget))
              .map(({ name, label }) => (
                <option key={name} value={name}>
                  {label}
                </option>
              ))}
          </select>
        </Field>
      )}

      {(fields.has('emit') || fields.has('listen')) && (
        <fieldset className="dk-field-group">
          <legend className="dk-field-label">Cross-filtering</legend>
          {fields.has('emit') && (
            <label className="dk-check">
              <input
                type="checkbox"
                checked={emitsFilters(widget)}
                onChange={(event) =>
                  onChange({
                    ...widget,
                    crossFilter: { ...widget.crossFilter, emit: event.currentTarget.checked },
                  })
                }
              />
              Clicking it filters other widgets
            </label>
          )}
          {fields.has('listen') && (
            <label className="dk-check">
              <input
                type="checkbox"
                checked={widget.crossFilter?.listen ?? true}
                onChange={(event) =>
                  onChange({
                    ...widget,
                    crossFilter: { ...widget.crossFilter, listen: event.currentTarget.checked },
                  })
                }
              />
              Follows filters from other widgets
            </label>
          )}
        </fieldset>
      )}
    </section>
  );
}
