(function () {
    const SHEET_READ_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRPZHXFcFuVRHH2gV5lyTSR3BKyZ3C1KyWVDLs5U_NBnvmqecRKa1-BVXNxCy4UkTQaH1HamMW_c7Q_/pub?gid=1770165044&single=true&output=tsv';
    const TOTAL_COLUMNS = 58;
    const DUPLICATE_COLUMN_INDEX = 38;
    const FALLBACK_DUPLICATE_INDEX = 1;
    const PROJECT_HEADER_NAMES = ['nombre del proyecto'];
    const TIMESTAMP_HEADER_NAMES = ['marca temporal', 'timestamp'];
    const REPORT_DATE_HEADER_NAMES = ['fecha'];
    const STATUS_COMPLETE = 'complete';
    const STATUS_PROGRESS = 'progress';
    const STATUS_ISSUE = 'issue';
    const STATUS_PENDING = 'pending';

    const statusOptionSets = {
        guarantees: statusOptions(option('Entregado', STATUS_COMPLETE), option('Pendiente', STATUS_PROGRESS), option('Otro', STATUS_ISSUE)),
        interconnection: statusOptions(option('Firmado', STATUS_COMPLETE), option('Pendiente', STATUS_PROGRESS), option('Otro', STATUS_ISSUE)),
        misse: statusOptions(option('Aprobada', STATUS_COMPLETE), option('En elaboracion', STATUS_PROGRESS), option('Otro', STATUS_ISSUE)),
        consultation: statusOptions(option('Realizada', STATUS_COMPLETE), option('En proceso', STATUS_PROGRESS), option('Otro', STATUS_ISSUE)),
        mia: statusOptions(option('Aprobada', STATUS_COMPLETE), option('En proceso', STATUS_PROGRESS), option('Otro', STATUS_ISSUE)),
        etj: statusOptions(option('Aprobado', STATUS_COMPLETE), option('En elaboracion', STATUS_PROGRESS), option('Otro', STATUS_ISSUE)),
        defaultTerritory: statusOptions(option('Liberado', STATUS_COMPLETE), option('En proceso', STATUS_PROGRESS), option('Otro', STATUS_ISSUE)),
        municipality: statusOptions(option('Liberado', STATUS_COMPLETE), option('En proceso', STATUS_PROGRESS), option('Otros', STATUS_ISSUE)),
        easement: statusOptions(option('Liberado', STATUS_COMPLETE), option('En proceso', STATUS_PROGRESS), option('Otros', STATUS_ISSUE))
    };

    const sections = [
        {
            id: 'core-permits',
            title: 'Trámites estratégicos',
            procedures: [
                procedure('guarantees', 'Pago de garantías', 3, 4, 40, { statusOptions: statusOptionSets.guarantees }),
                procedure('interconnection', 'Contrato de interconexión', 5, 6, 41, { statusOptions: statusOptionSets.interconnection }),
                procedure('misse', 'MISSE/EVIS', 7, 8, 42, { statusOptions: statusOptionSets.misse }),
                procedure('consultation', 'Consulta previa libre e informada', 9, 10, 43, { statusOptions: statusOptionSets.consultation }),
                procedure('mia', 'Manifestación de Impacto Ambiental', 12, 13, 44, { statusOptions: statusOptionSets.mia, typeColumn: 11, typeLabel: 'Tipo de MIA' }),
                procedure('etj', 'Estudio Técnico Justificativo', 15, 16, 45, { statusOptions: statusOptionSets.etj, typeColumn: 14, typeLabel: 'Tipo de ETJ' })
            ]
        },
        {
            id: 'territory',
            title: 'Permisos territoriales y sectoriales',
            procedures: [
                procedure('inah', 'Trámites ante INAH', 17, 18, 46),
                procedure('conagua', 'Trámites ante CONAGUA', 19, 20, 47),
                procedure('conafor', 'Trámites ante CONAFOR', 21, 22, 48),
                procedure('sedatu', 'Trámites ante SEDATU', 23, 24, 49),
                procedure('land-possession', 'Posesión de terrenos', 25, 26, 50),
                procedure('construction-license', 'Licencia de construcción', 27, 28, 51)
            ]
        },
        {
            id: 'closure',
            title: 'Infraestructura y cierre operativo',
            procedures: [
                procedure('municipality', 'Trámites municipales', 29, 30, 52, { statusOptions: statusOptionSets.municipality }),
                procedure('easement', 'Servidumbre de paso', 31, 32, 53, { statusOptions: statusOptionSets.easement }),
                procedure('right-of-way', 'Derecho de vía', 33, 34, 54),
                procedure('reinforcement-works', 'Obras de refuerzo', 35, 36, 55),
                procedure('procurement', 'Avances en procura', 37, 38, 56)
            ]
        }
    ];

    const state = {
        rawRecords: [],
        projects: [],
        procedureRows: [],
        filteredRows: [],
        filteredProjects: [],
        filters: {
            project: '',
            stage: '',
            procedure: '',
            mode: '',
            status: '',
            type: '',
            search: ''
        },
        page: 1,
        pageSize: 25
    };

    const els = {
        projectFilter: document.getElementById('project-filter'),
        stageFilter: document.getElementById('stage-filter'),
        procedureFilter: document.getElementById('procedure-filter'),
        modeFilter: document.getElementById('mode-filter'),
        statusFilter: document.getElementById('status-filter'),
        typeFilter: document.getElementById('type-filter'),
        searchFilter: document.getElementById('search-filter'),
        statusMessage: document.getElementById('status-message'),
        reloadButton: document.getElementById('reload-button'),
        pdfButton: document.getElementById('download-pdf-button'),
        pptButton: document.getElementById('download-ppt-button'),
        excelButton: document.getElementById('download-excel-button'),
        pagination: document.getElementById('table-pagination'),
        pagePrev: document.getElementById('page-prev'),
        pageNext: document.getElementById('page-next'),
        pageInfo: document.getElementById('page-info'),
        pageSize: document.getElementById('page-size'),
        kpiProjects: document.getElementById('kpi-projects'),
        kpiAverage: document.getElementById('kpi-average'),
        kpiComplete: document.getElementById('kpi-complete'),
        kpiAttention: document.getElementById('kpi-attention'),
        projectCountLabel: document.getElementById('project-count-label'),
        detailCountLabel: document.getElementById('detail-count-label'),
        projectList: document.getElementById('project-progress-list'),
        statusBars: document.getElementById('status-bars'),
        stageBars: document.getElementById('stage-bars'),
        detailTableBody: document.getElementById('detail-table-body'),
        reportDeck: document.getElementById('internal-report-deck'),
        evolutionList: document.getElementById('evolution-list'),
        evolutionCountLabel: document.getElementById('evolution-count-label')
    };

    init();

    function init() {
        attachEvents();
        loadData();
    }

    function attachEvents() {
        [els.projectFilter, els.stageFilter, els.procedureFilter, els.modeFilter, els.statusFilter, els.typeFilter].forEach((field) => {
            field.addEventListener('change', () => {
                state.filters[field.id.replace('-filter', '').replace('project', 'project').replace('stage', 'stage').replace('procedure', 'procedure').replace('mode', 'mode').replace('status', 'status').replace('type', 'type')] = field.value;
                applyFilters();
            });
        });
        els.searchFilter.addEventListener('input', () => {
            state.filters.search = els.searchFilter.value;
            applyFilters();
        });
        els.reloadButton.addEventListener('click', loadData);
        els.pdfButton.addEventListener('click', downloadPdf);
        els.pptButton.addEventListener('click', downloadPpt);
        if (els.excelButton) els.excelButton.addEventListener('click', downloadExcel);
        if (els.pagePrev) els.pagePrev.addEventListener('click', () => { state.page = Math.max(1, state.page - 1); renderDetailTable(state.filteredRows); });
        if (els.pageNext) els.pageNext.addEventListener('click', () => { state.page += 1; renderDetailTable(state.filteredRows); });
        if (els.pageSize) els.pageSize.addEventListener('change', () => {
            const v = els.pageSize.value;
            state.pageSize = v === 'all' ? Infinity : Number(v) || 25;
            state.page = 1;
            renderDetailTable(state.filteredRows);
        });
    }

    async function loadData() {
        setMessage('Cargando información de Google Sheets...', '');
        try {
            const response = await fetch(`${SHEET_READ_URL}&cacheBust=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`No se pudo consultar la hoja publicada (${response.status}).`);
            }
            const content = await response.text();
            const table = parseDelimitedRows(content, '\t').filter((row) => row.some((cell) => String(cell || '').trim()));
            const headers = table[0] || [];
            const rows = table.slice(1);
            state.rawRecords = buildSheetRecords(headers, rows);
            state.projects = buildProjectSnapshots(state.rawRecords);
            state.procedureRows = state.projects.flatMap(buildProcedureRows);
            populateFilters();
            applyFilters();
            setMessage(`Datos actualizados: ${state.projects.length} proyectos y ${state.rawRecords.length} capturas históricas.`, '');
        } catch (error) {
            setMessage(error.message || 'No fue posible cargar la información.', 'is-error');
        }
    }

    function populateFilters() {
        fillSelect(els.projectFilter, 'Todos los proyectos', unique(state.projects.map((project) => project.projectName)));
        fillSelect(els.stageFilter, 'Todas las etapas', sections.map((section) => section.title));
        fillSelect(els.procedureFilter, 'Todos los trámites', getAllProcedures().map((item) => item.title));
        fillSelect(els.statusFilter, 'Todos los estatus', unique(state.procedureRows.map((row) => row.status).filter(Boolean)));
        fillSelect(els.typeFilter, 'Todos los tipos', unique(state.procedureRows.map((row) => row.typeValue).filter(Boolean)));
    }

    function fillSelect(select, allLabel, values) {
        const previous = select.value;
        select.innerHTML = [`<option value="">${escapeHtml(allLabel)}</option>`]
            .concat(values.map((value) => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`))
            .join('');
        select.value = values.includes(previous) ? previous : '';
    }

    function applyFilters() {
        const filters = readFilters();
        state.filteredRows = state.procedureRows.filter((row) => matchesFilters(row, filters));
        const visibleProjectKeys = new Set(state.filteredRows.map((row) => row.projectKey));
        state.filteredProjects = state.projects.filter((project) => visibleProjectKeys.has(project.projectKey));
        state.page = 1;
        renderDashboard();
    }

    function readFilters() {
        state.filters = {
            project: els.projectFilter.value,
            stage: els.stageFilter.value,
            procedure: els.procedureFilter.value,
            mode: els.modeFilter.value,
            status: els.statusFilter.value,
            type: els.typeFilter.value,
            search: normalize(els.searchFilter.value)
        };
        return state.filters;
    }

    function matchesFilters(row, filters) {
        if (filters.project && row.projectName !== filters.project) return false;
        if (filters.stage && row.stage !== filters.stage) return false;
        if (filters.procedure && row.procedureTitle !== filters.procedure) return false;
        if (filters.mode && row.mode !== filters.mode) return false;
        if (filters.status && row.status !== filters.status) return false;
        if (filters.type && row.typeValue !== filters.type) return false;
        if (filters.search) {
            const haystack = normalize([row.projectName, row.stage, row.procedureTitle, row.status, row.typeValue, row.note].join(' '));
            if (!haystack.includes(filters.search)) return false;
        }
        return true;
    }

    function renderDashboard() {
        const summary = summarizeRows(state.filteredRows, state.filteredProjects);
        els.kpiProjects.textContent = summary.projectCount;
        els.kpiAverage.textContent = `${summary.averagePercent}%`;
        els.kpiComplete.textContent = summary.complete;
        els.kpiAttention.textContent = summary.progress + summary.issue;
        els.projectCountLabel.textContent = `${summary.projectCount} proyectos`;
        els.detailCountLabel.textContent = `${state.filteredRows.length} registros`;

        renderProjectList(summary.projects);
        renderStatusBars(summary);
        renderStageBars(summary.stageSummaries);
        renderEvolutionPanel(summary.projects);
        renderDetailTable(state.filteredRows);
        renderReportDeck(summary);
    }

    function renderEvolutionPanel(projects) {
        if (!els.evolutionList) return;
        const filters = state.filters;
        const sorted = projects.slice().sort((a, b) => a.projectName.localeCompare(b.projectName, 'es'));
        els.evolutionCountLabel.textContent = `${sorted.length} proyectos`;
        els.evolutionList.innerHTML = sorted.length ? sorted.map((project) => {
            const evolution = buildFilteredEvolution(project, filters);
            return `
                <div class="evolution-row">
                    <div class="evolution-row__head">
                        <strong>${escapeHtml(project.projectName)}</strong>
                        <span class="muted">${project.completed}/${project.total} · ${project.percent}%</span>
                    </div>
                    ${renderEvolutionChart(evolution, { width: 1180, height: 220, interactive: true })}
                </div>
            `;
        }).join('') : '<p class="muted">Sin proyectos para los filtros seleccionados.</p>';
        attachEvolutionInteractivity(els.evolutionList);
    }

    function buildFilteredEvolution(project, filters) {
        const history = (project.history || []).map((record) => ({ record, date: parseRecordDate(record) })).filter((entry) => entry.date);
        if (history.length === 0) return { points: [], granularity: 'none' };

        const procSubset = filteredProcedures(filters);

        const computePercent = (record) => {
            let total = 0, complete = 0;
            procSubset.forEach((item) => {
                if (filters.type) {
                    const tv = item.proc.typeColumn ? readRecordColumn(record, item.proc.typeColumn) : '';
                    if (tv !== filters.type) return;
                }
                const status = readRecordColumn(record, item.proc.statusColumn);
                const mode = getStatusMode(item.proc, status) || STATUS_PENDING;
                if (filters.mode && mode !== filters.mode) return;
                if (filters.status && status !== filters.status) return;
                total += 1;
                if (mode === STATUS_COMPLETE) complete += 1;
            });
            return total ? Math.round((complete / total) * 100) : null;
        };

        const bucketBy = (keyFn) => {
            const map = new Map();
            history.forEach((entry) => {
                const key = keyFn(entry.date);
                const existing = map.get(key);
                if (!existing || entry.date > existing.date) map.set(key, entry);
            });
            return Array.from(map.values()).sort((a, b) => a.date - b.date);
        };

        let granularity = 'week';
        let entries = bucketBy((d) => isoWeekKey(d));
        if (entries.length < 2) {
            granularity = 'day';
            entries = bucketBy((d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
        }
        if (entries.length < 2) {
            granularity = 'capture';
            entries = history.slice().sort((a, b) => a.date - b.date);
        }

        const points = entries
            .map((entry) => ({ date: entry.date, percent: computePercent(entry.record) }))
            .filter((p) => p.percent !== null);

        return { granularity, points };
    }

    function filteredProcedures(filters) {
        const list = [];
        sections.forEach((section) => {
            if (filters.stage && section.title !== filters.stage) return;
            section.procedures.forEach((proc) => {
                if (filters.procedure && proc.title !== filters.procedure) return;
                list.push({ section, proc });
            });
        });
        return list;
    }

    function renderProjectList(projects) {
        const sorted = projects.slice().sort((a, b) => a.percent - b.percent || a.projectName.localeCompare(b.projectName, 'es'));
        els.projectList.innerHTML = sorted.length ? sorted.map((project) => `
            <div class="project-row">
                <div class="project-row__top">
                    <span>${escapeHtml(project.projectName)}</span>
                    <strong>${project.percent}%</strong>
                </div>
                <div class="track"><span style="width:${project.percent}%"></span></div>
                <div class="project-row__meta">${project.completed}/${project.total} concluidos · ${escapeHtml(project.lastUpdate || 'Sin fecha')}</div>
            </div>
        `).join('') : '<p class="muted">Sin proyectos para los filtros seleccionados.</p>';
    }

    function renderStatusBars(summary) {
        const rows = [
            { label: 'Concluidos', value: summary.complete, total: summary.total, tone: 'complete' },
            { label: 'En proceso', value: summary.progress, total: summary.total, tone: 'progress' },
            { label: 'Incidencias', value: summary.issue, total: summary.total, tone: 'issue' },
            { label: 'Sin dato', value: summary.pending, total: summary.total, tone: 'pending' }
        ];
        els.statusBars.innerHTML = rows.map(renderBarRow).join('');
    }

    function renderStageBars(stageSummaries) {
        els.stageBars.innerHTML = stageSummaries.map((stage) => renderBarRow({
            label: stage.title,
            value: stage.completed,
            total: stage.total,
            tone: 'complete',
            detail: `${stage.percent}% · ${stage.completed}/${stage.total}`
        })).join('');
    }

    function renderBarRow(item) {
        const percent = item.total ? Math.round((item.value / item.total) * 100) : 0;
        return `
            <div class="bar-row">
                <div class="bar-row__top">
                    <span>${escapeHtml(item.label)}</span>
                    <strong>${escapeHtml(item.detail || String(item.value))}</strong>
                </div>
                <div class="track track--${item.tone}"><span style="width:${item.value > 0 ? Math.max(3, percent) : 0}%"></span></div>
            </div>
        `;
    }

    function renderDetailTable(rows) {
        const sorted = rows.slice().sort((a, b) => a.projectName.localeCompare(b.projectName, 'es') || a.stage.localeCompare(b.stage, 'es'));
        const size = state.pageSize === Infinity ? sorted.length || 1 : state.pageSize;
        const totalPages = Math.max(1, Math.ceil(sorted.length / size));
        if (state.page > totalPages) state.page = totalPages;
        const start = (state.page - 1) * size;
        const pageRows = sorted.slice(start, start + size);

        els.detailTableBody.innerHTML = pageRows.length ? pageRows.map((row) => `
            <tr>
                <td><strong>${escapeHtml(row.projectName)}</strong></td>
                <td>${escapeHtml(row.stage)}</td>
                <td>${escapeHtml(row.procedureTitle)}</td>
                <td><span class="status-pill status-pill--${row.mode}">${escapeHtml(row.status || 'Sin dato')}</span></td>
                <td>${escapeHtml(row.typeValue || 'No aplica')}</td>
                <td>${escapeHtml(row.lastUpdate || 'Sin fecha')}</td>
                <td class="muted">${escapeHtml(row.note || 'Sin comentario')}</td>
            </tr>
        `).join('') : '<tr><td colspan="7" class="muted">No hay registros para los filtros seleccionados.</td></tr>';

        if (els.pagination) {
            const visible = sorted.length > 0;
            els.pagination.hidden = !visible;
            if (visible) {
                const from = start + 1;
                const to = Math.min(start + size, sorted.length);
                els.pageInfo.textContent = `Página ${state.page} de ${totalPages} · ${from}-${to} de ${sorted.length}`;
                els.pagePrev.disabled = state.page <= 1;
                els.pageNext.disabled = state.page >= totalPages;
            }
        }
    }

    function summarizeRows(rows, projects) {
        const total = rows.length;
        const complete = rows.filter((row) => row.mode === STATUS_COMPLETE).length;
        const progress = rows.filter((row) => row.mode === STATUS_PROGRESS).length;
        const issue = rows.filter((row) => row.mode === STATUS_ISSUE).length;
        const pending = rows.filter((row) => row.mode === STATUS_PENDING).length;
        const projectSummaries = projects.map((project) => summarizeProject(
            project,
            state.procedureRows.filter((row) => row.projectKey === project.projectKey)
        ));
        const averagePercent = projectSummaries.length
            ? Math.round(projectSummaries.reduce((sum, project) => sum + project.percent, 0) / projectSummaries.length)
            : 0;
        return {
            total,
            complete,
            progress,
            issue,
            pending,
            projectCount: projectSummaries.length,
            averagePercent,
            projects: projectSummaries,
            stageSummaries: summarizeStages(rows)
        };
    }

    function summarizeProject(project, rows) {
        const total = rows.length;
        const completed = rows.filter((row) => row.mode === STATUS_COMPLETE).length;
        return {
            projectName: project.projectName,
            projectKey: project.projectKey,
            total,
            completed,
            percent: total ? Math.round((completed / total) * 100) : 0,
            lastUpdate: project.timestamp || project.reportDate,
            sourceRows: project.sourceRows,
            history: project.history || []
        };
    }

    function summarizeStages(rows) {
        return sections.map((section) => {
            const stageRows = rows.filter((row) => row.stage === section.title);
            const total = stageRows.length;
            const completed = stageRows.filter((row) => row.mode === STATUS_COMPLETE).length;
            return {
                title: section.title,
                total,
                completed,
                percent: total ? Math.round((completed / total) * 100) : 0
            };
        });
    }

    function buildProcedureRows(project) {
        return sections.flatMap((section) => section.procedures.map((item) => {
            const status = readRecordColumn(project, item.statusColumn);
            const mode = getStatusMode(item, status) || STATUS_PENDING;
            const typeValue = item.typeColumn ? readRecordColumn(project, item.typeColumn) : '';
            return {
                projectName: project.projectName,
                projectKey: project.projectKey,
                stage: section.title,
                stageId: section.id,
                procedureId: item.id,
                procedureTitle: item.title,
                status,
                mode,
                typeValue,
                note: readRecordColumn(project, item.summaryColumn) || readRecordColumn(project, item.detailColumn),
                lastUpdate: project.timestamp || project.reportDate,
                sourceRows: project.sourceRows
            };
        }));
    }

    function buildProjectSnapshots(records) {
        const grouped = new Map();
        records.forEach((record) => {
            const key = normalize(record.projectName);
            if (!key) return;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(record);
        });

        return Array.from(grouped.entries()).map(([projectKey, projectRecords]) => {
            const latestRecord = projectRecords[projectRecords.length - 1];
            const mergedValues = Array(TOTAL_COLUMNS).fill('');
            projectRecords.forEach((record) => {
                const rowValues = ensureRowLength(record.rowValues || []);
                rowValues.forEach((value, index) => {
                    const cleanValue = String(value || '').trim();
                    if (cleanValue) mergedValues[index] = cleanValue;
                });
            });
            mergedValues[38] = latestRecord.projectName;
            return {
                projectKey,
                projectName: latestRecord.projectName,
                timestamp: latestRecord.timestamp,
                reportDate: latestRecord.reportDate,
                rowValues: mergedValues,
                sourceRows: projectRecords.length,
                history: projectRecords
            };
        });
    }

    function parseRecordDate(record) {
        const candidates = [record.timestamp, record.reportDate];
        for (const c of candidates) {
            const d = parseDateLoose(c);
            if (d) return d;
        }
        return null;
    }

    function parseDateLoose(value) {
        if (!value) return null;
        const str = String(value).trim();
        if (!str) return null;
        let m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
        if (m) {
            let [_, a, b, y] = m;
            y = y.length === 2 ? '20' + y : y;
            const d = new Date(Number(y), Number(b) - 1, Number(a));
            if (!isNaN(d)) return d;
        }
        m = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
        if (m) {
            const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
            if (!isNaN(d)) return d;
        }
        const d = new Date(str);
        return isNaN(d) ? null : d;
    }

    function isoWeekKey(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const day = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - day);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
        return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    }

    function computeRecordPercent(record) {
        let total = 0;
        let complete = 0;
        sections.forEach((section) => {
            section.procedures.forEach((item) => {
                const status = readRecordColumn(record, item.statusColumn);
                const mode = getStatusMode(item, status) || STATUS_PENDING;
                total += 1;
                if (mode === STATUS_COMPLETE) complete += 1;
            });
        });
        return total ? Math.round((complete / total) * 100) : 0;
    }

    function buildWeeklyEvolution(project) {
        const history = (project.history || []).map((record) => ({ record, date: parseRecordDate(record) })).filter((entry) => entry.date);
        if (history.length === 0) return { points: [], granularity: 'none' };

        const bucket = (keyFn) => {
            const map = new Map();
            history.forEach((entry) => {
                const key = keyFn(entry.date);
                const existing = map.get(key);
                if (!existing || entry.date > existing.date) map.set(key, entry);
            });
            return Array.from(map.values()).sort((a, b) => a.date - b.date);
        };

        let granularity = 'week';
        let points = bucket((d) => isoWeekKey(d));
        if (points.length < 2) {
            granularity = 'day';
            points = bucket((d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
        }
        if (points.length < 2) {
            granularity = 'capture';
            points = history.slice().sort((a, b) => a.date - b.date);
        }

        return {
            granularity,
            points: points.map((entry) => ({
                date: entry.date,
                percent: computeRecordPercent(entry.record)
            }))
        };
    }

    function buildSheetRecords(headers, rows) {
        const normalizedHeaders = headers.map(normalize);
        const projectIndex = findHeaderIndex(normalizedHeaders, PROJECT_HEADER_NAMES);
        const timestampIndex = findHeaderIndex(normalizedHeaders, TIMESTAMP_HEADER_NAMES);
        const reportDateIndex = findHeaderIndex(normalizedHeaders, REPORT_DATE_HEADER_NAMES);
        return rows.map((row) => {
            const projectName = extractProjectName(row, projectIndex);
            const timestamp = readCell(row, timestampIndex) || readCell(row, 0);
            const reportDate = extractReportDate(row, reportDateIndex, timestamp);
            return { projectName, timestamp, reportDate, rowValues: ensureRowLength(row) };
        }).filter((record) => record.projectName);
    }

    function renderReportDeck(summary) {
        const reportDate = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
        const topProjects = summary.projects.slice().sort((a, b) => a.percent - b.percent).slice(0, 8);
        const attentionRows = state.filteredRows
            .filter((row) => row.mode === STATUS_PROGRESS || row.mode === STATUS_ISSUE)
            .slice(0, 12);
        const projectSlides = summary.projects
            .slice()
            .sort((a, b) => a.projectName.localeCompare(b.projectName, 'es'))
            .map((project) => renderProjectDetailSlide(project, state.filteredRows.filter((row) => row.projectKey === project.projectKey)))
            .join('');

        els.reportDeck.innerHTML = `
            <section class="internal-slide internal-slide--cover">
                <img class="internal-cover-bg" src="Estilos Institucionales/img/portada_ppt.png" alt="">
                ${renderSlideHeader('DGMESNIE · Seguimiento')}
                <div class="internal-cover-body">
                    <p class="eyebrow">Reporte interno</p>
                    <h2>Seguimiento de Proyectos</h2>
                    <p class="unit">Dirección General de Metodologías y Estadísticas del Sistema Nacional de Información Energética</p>
                    <div class="internal-cover-meta">
                        <span><strong>Proyectos</strong>${summary.projectCount}</span>
                        <span><strong>Avance promedio</strong>${summary.averagePercent}%</span>
                        <span><strong>Fecha del reporte</strong>${escapeHtml(reportDate)}</span>
                    </div>
                </div>
                ${renderSlideFooter()}
            </section>
            <section class="internal-slide internal-slide--content">
                ${renderSlideHeader('Seguimiento interno')}
                <div class="internal-slide__body">
                    <h2>Reporte de seguimiento de proyectos</h2>
                    <div class="slide-kpis">
                        ${renderSlideKpi('Proyectos', summary.projectCount)}
                        ${renderSlideKpi('Avance promedio', `${summary.averagePercent}%`)}
                        ${renderSlideKpi('Concluidos', summary.complete)}
                        ${renderSlideKpi('Atención', summary.progress + summary.issue)}
                    </div>
                    <div class="slide-grid">
                        <div>
                            <h3>Proyectos con menor avance</h3>
                            ${topProjects.map((project) => renderSlideBar(project.projectName, project.percent, `${project.completed}/${project.total}`)).join('')}
                        </div>
                        <div>
                            <h3>Distribución por estatus</h3>
                            ${[
                                ['Concluidos', summary.complete, summary.total, 'complete'],
                                ['En proceso', summary.progress, summary.total, 'progress'],
                                ['Incidencias', summary.issue, summary.total, 'issue'],
                                ['Sin dato', summary.pending, summary.total, 'pending']
                            ].map(([label, value, total, tone]) => renderSlideBar(label, total ? Math.round((value / total) * 100) : 0, value, tone)).join('')}
                        </div>
                    </div>
                </div>
                ${renderSlideFooter()}
            </section>
            <section class="internal-slide internal-slide--content">
                ${renderSlideHeader('Detalle de atención')}
                <div class="internal-slide__body">
                    <h2>Trámites en seguimiento</h2>
                    <table class="slide-table">
                        <thead><tr><th>Proyecto</th><th>Etapa</th><th>Trámite</th><th>Estatus</th><th>Comentario</th></tr></thead>
                        <tbody>
                            ${attentionRows.length ? attentionRows.map((row) => `
                                <tr>
                                    <td>${escapeHtml(row.projectName)}</td>
                                    <td>${escapeHtml(row.stage)}</td>
                                    <td>${escapeHtml(row.procedureTitle)}</td>
                                    <td>${escapeHtml(row.status || 'Sin dato')}</td>
                                    <td>${escapeHtml(row.note || 'Sin comentario')}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5">No hay trámites en proceso o con incidencia para los filtros actuales.</td></tr>'}
                        </tbody>
                    </table>
                </div>
                ${renderSlideFooter()}
            </section>
            ${projectSlides}
        `;
    }

    function renderProjectDetailSlide(project, rows) {
        const complete = rows.filter((row) => row.mode === STATUS_COMPLETE).length;
        const progress = rows.filter((row) => row.mode === STATUS_PROGRESS).length;
        const issue = rows.filter((row) => row.mode === STATUS_ISSUE).length;
        const pending = rows.filter((row) => row.mode === STATUS_PENDING).length;
        const stageRows = sections.map((section) => {
            const values = rows.filter((row) => row.stage === section.title);
            const total = values.length;
            const completed = values.filter((row) => row.mode === STATUS_COMPLETE).length;
            return {
                title: section.title,
                id: section.id,
                percent: total ? Math.round((completed / total) * 100) : 0,
                completed,
                total,
                detail: `${completed}/${total}`
            };
        });
        const evolution = buildWeeklyEvolution(project);
        const stagesWithRows = sections
            .map((section) => ({ section, items: rows.filter((row) => row.stage === section.title) }))
            .filter((entry) => entry.items.length > 0);
        const totalSlides = 1 + stagesWithRows.length;

        const summarySlide = `
            <section class="internal-slide internal-slide--content internal-slide--project">
                ${renderSlideHeader('Resumen por proyecto')}
                <div class="internal-slide__body">
                    <div class="project-slide-head">
                        <div>
                            <p>Proyecto · slide 1 de ${totalSlides}</p>
                            <h2>${escapeHtml(project.projectName)}</h2>
                            <span>${project.sourceRows} capturas históricas · Última actualización: ${escapeHtml(project.lastUpdate || 'Sin fecha')}</span>
                            ${renderStatusStackedBar(complete, progress, issue, pending)}
                        </div>
                        ${renderDonut(project.percent)}
                    </div>
                    <div class="slide-kpis slide-kpis--project">
                        ${renderSlideKpi('Concluidos', complete, 'complete')}
                        ${renderSlideKpi('En proceso', progress, 'progress')}
                        ${renderSlideKpi('Incidencias', issue, 'issue')}
                        ${renderSlideKpi('Sin dato', pending, 'pending')}
                    </div>
                    <div class="slide-evolution">
                        <h3>Evolución semanal del avance</h3>
                        ${renderEvolutionChart(evolution, { interactive: false, height: 110, width: 1180 })}
                    </div>
                    <div>
                        <h3>Avance por etapa</h3>
                        ${stageRows.map((stage) => renderSlideBar(stage.title, stage.percent, `${stage.percent}% · ${stage.detail}`, percentTone(stage.percent))).join('')}
                    </div>
                </div>
                ${renderSlideFooter()}
            </section>
        `;

        const stageSlides = stagesWithRows.map((entry, index) => renderProjectStageSlide(project, entry.section, entry.items, index + 2, totalSlides)).join('');

        return summarySlide + stageSlides;
    }

    function renderProjectStageSlide(project, section, items, pageNum, totalSlides) {
        const c = items.filter((r) => r.mode === STATUS_COMPLETE).length;
        const p = items.filter((r) => r.mode === STATUS_PROGRESS).length;
        const i = items.filter((r) => r.mode === STATUS_ISSUE).length;
        const pen = items.filter((r) => r.mode === STATUS_PENDING).length;
        const total = items.length;
        const percent = total ? Math.round((c / total) * 100) : 0;

        return `
            <section class="internal-slide internal-slide--content internal-slide--project internal-slide--stage">
                ${renderSlideHeader(`Etapa · ${section.title}`)}
                <div class="internal-slide__body">
                    <div class="project-slide-head project-slide-head--stage">
                        <div>
                            <p>Proyecto · slide ${pageNum} de ${totalSlides}</p>
                            <h2>${escapeHtml(project.projectName)}</h2>
                            <span>${escapeHtml(section.title)} · ${c}/${total} concluidos</span>
                        </div>
                        ${renderDonut(percent)}
                    </div>
                    <div class="slide-kpis slide-kpis--project">
                        ${renderSlideKpi('Concluidos', c, 'complete')}
                        ${renderSlideKpi('En proceso', p, 'progress')}
                        ${renderSlideKpi('Incidencias', i, 'issue')}
                        ${renderSlideKpi('Sin dato', pen, 'pending')}
                    </div>
                    <h3>Trámites de la etapa (${total})</h3>
                    <table class="slide-table slide-table--detail slide-table--stage">
                        <thead>
                            <tr>
                                <th>Trámite</th>
                                <th>Estatus</th>
                                <th>Tipo</th>
                                <th>Última actualización</th>
                                <th>Comentario</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map((row) => `
                                <tr>
                                    <td><strong>${escapeHtml(row.procedureTitle)}</strong></td>
                                    <td><span class="status-pill status-pill--${row.mode}">${escapeHtml(row.status || 'Sin dato')}</span></td>
                                    <td>${escapeHtml(row.typeValue || 'No aplica')}</td>
                                    <td>${escapeHtml(row.lastUpdate || 'Sin fecha')}</td>
                                    <td class="muted">${escapeHtml(truncate(row.note || 'Sin comentario', 160))}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ${renderSlideFooter()}
            </section>
        `;
    }

    function truncate(str, max) {
        const s = String(str || '');
        return s.length > max ? s.slice(0, max - 1) + '…' : s;
    }

    function chunkArray(arr, size) {
        const out = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
    }

    function renderSlideHeader(title) {
        return `
            <div class="internal-slide__top">
                <div class="internal-slide__brand">
                    <img src="Estilos Institucionales/img/logo_gob.png" alt="Gobierno de México">
                    <img src="Estilos Institucionales/img/logo_sener.png" alt="Secretaría de Energía">
                </div>
                <div class="internal-slide__title">${escapeHtml(title)}</div>
                <div class="internal-slide__unit">DGMESNIE · Subsecretaría de Planeación</div>
            </div>
        `;
    }

    function renderSlideFooter() {
        return '<div class="internal-slide__footer"><span></span><span></span><span></span></div>';
    }

    function renderSlideKpi(label, value, tone) {
        const toneClass = tone ? ` class="slide-kpi--${tone}"` : '';
        return `<article${toneClass}><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
    }

    function renderDonut(percent) {
        const value = Math.max(0, Math.min(100, Number(percent) || 0));
        const radius = 46;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference * (1 - value / 100);
        const color = value >= 80 ? '#027a48' : value >= 40 ? '#b54708' : value > 0 ? '#b42318' : '#667085';
        return `
            <div class="slide-donut" role="img" aria-label="Avance ${value}%">
                <svg viewBox="0 0 120 120" width="120" height="120">
                    <circle cx="60" cy="60" r="${radius}" fill="none" stroke="rgba(15,23,42,0.10)" stroke-width="12"></circle>
                    <circle cx="60" cy="60" r="${radius}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"
                        stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
                        transform="rotate(-90 60 60)"></circle>
                    <text x="60" y="58" text-anchor="middle" dominant-baseline="middle"
                        font-family="Patria, Georgia, serif" font-size="26" font-weight="700" fill="${color}">${value}%</text>
                    <text x="60" y="78" text-anchor="middle" dominant-baseline="middle"
                        font-family="Noto Sans Local, Arial, sans-serif" font-size="9" font-weight="700"
                        fill="#53617a" letter-spacing="1.5">AVANCE</text>
                </svg>
            </div>
        `;
    }

    function renderStatusStackedBar(complete, progress, issue, pending) {
        const total = complete + progress + issue + pending;
        if (!total) return '';
        const seg = (value, color, label) => {
            const pct = (value / total) * 100;
            if (pct <= 0) return '';
            return `<span class="slide-stack__seg" style="width:${pct.toFixed(2)}%;background:${color}" title="${label}: ${value}"></span>`;
        };
        return `
            <div class="slide-stack">
                <div class="slide-stack__bar">
                    ${seg(complete, '#027a48', 'Concluidos')}
                    ${seg(progress, '#b54708', 'En proceso')}
                    ${seg(issue, '#b42318', 'Incidencias')}
                    ${seg(pending, '#667085', 'Sin dato')}
                </div>
                <div class="slide-stack__legend">
                    <span><i style="background:#027a48"></i>Concluidos ${complete}</span>
                    <span><i style="background:#b54708"></i>En proceso ${progress}</span>
                    <span><i style="background:#b42318"></i>Incidencias ${issue}</span>
                    <span><i style="background:#667085"></i>Sin dato ${pending}</span>
                </div>
            </div>
        `;
    }

    function renderEvolutionChart(evolution, options) {
        const opts = options || {};
        const points = (evolution && evolution.points) || [];
        const granularity = (evolution && evolution.granularity) || 'week';
        if (!points.length) {
            return '<p class="slide-evolution__empty muted">Sin fechas válidas en el historial.</p>';
        }
        if (points.length === 1) {
            const p = points[0];
            return `<p class="slide-evolution__empty muted">Solo un registro (${escapeHtml(weekLabel(p.date, granularity))}): ${p.percent}%.</p>`;
        }
        const granularityLabel = granularity === 'week' ? 'Semanal' : granularity === 'day' ? 'Diario' : 'Por captura';
        const interactive = opts.interactive !== false;
        const width = opts.width || 1180;
        const height = opts.height || 110;
        const padL = 44, padR = 24, padT = 18, padB = 38;
        const innerW = width - padL - padR;
        const innerH = height - padT - padB;
        const n = points.length;
        const stepX = n > 1 ? innerW / (n - 1) : 0;
        const xy = (i, pct) => [padL + i * stepX, padT + innerH * (1 - pct / 100)];

        const grid = [0, 25, 50, 75, 100].map((g) => {
            const y = padT + innerH * (1 - g / 100);
            return `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="rgba(15,23,42,0.08)" stroke-width="1"></line>
                    <text x="${padL - 8}" y="${y + 3}" text-anchor="end" font-size="9" fill="#53617a">${g}%</text>`;
        }).join('');

        const linePts = points.map((p, i) => xy(i, p.percent));
        const path = linePts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
        const areaPath = `${path} L ${linePts[linePts.length - 1][0].toFixed(1)} ${padT + innerH} L ${linePts[0][0].toFixed(1)} ${padT + innerH} Z`;

        const dots = points.map((p, i) => {
            const [x, y] = xy(i, p.percent);
            const color = p.percent >= 80 ? '#027a48' : p.percent >= 40 ? '#b54708' : p.percent > 0 ? '#b42318' : '#667085';
            const showLabel = n <= 12 || i === 0 || i === n - 1 || i % Math.ceil(n / 8) === 0;
            return `
                <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${color}" stroke="#ffffff" stroke-width="2"></circle>
                ${showLabel ? `<text x="${x.toFixed(1)}" y="${(y - 9).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#1f2937">${p.percent}%</text>` : ''}
            `;
        }).join('');

        const xLabels = points.map((p, i) => {
            const [x] = xy(i, 0);
            const show = n <= 10 || i === 0 || i === n - 1 || i % Math.ceil(n / 8) === 0;
            if (!show) return '';
            return `<text x="${x.toFixed(1)}" y="${height - 10}" text-anchor="middle" font-size="9" fill="#53617a">${escapeHtml(weekLabel(p.date, granularity))}</text>`;
        }).join('');

        const first = points[0].percent;
        const last = points[points.length - 1].percent;
        const delta = last - first;
        const deltaColor = delta > 0 ? '#027a48' : delta < 0 ? '#b42318' : '#53617a';
        const deltaSign = delta > 0 ? '+' : '';

        const dataAttr = interactive
            ? `data-evo='${escapeAttribute(JSON.stringify({
                points: points.map((p) => ({ d: p.date.toISOString(), p: p.percent })),
                granularity,
                width, height, padL, padR, padT, padB
            }))}'`
            : '';
        const animClass = interactive ? ' evo-chart--animated' : '';

        return `
            <div class="slide-evolution__chart evo-chart${animClass}" ${dataAttr}>
                <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" width="100%" height="${height}">
                    ${grid}
                    <path class="evo-area" d="${areaPath}" fill="rgba(155,34,71,0.10)"></path>
                    <path class="evo-line" d="${path}" fill="none" stroke="#9b2247" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></path>
                    <line class="evo-cursor" x1="0" y1="${padT}" x2="0" y2="${height - padB}" stroke="#9b2247" stroke-width="1" stroke-dasharray="3 3" opacity="0"></line>
                    ${dots}
                    ${xLabels}
                </svg>
                <div class="evo-tooltip" hidden></div>
                <div class="slide-evolution__meta">
                    <span><strong>${granularityLabel}:</strong> ${n} puntos</span>
                    <span><strong>Inicio:</strong> ${first}%</span>
                    <span><strong>Actual:</strong> ${last}%</span>
                    <span style="color:${deltaColor}"><strong>Cambio:</strong> ${deltaSign}${delta} pp</span>
                </div>
            </div>
        `;
    }

    function attachEvolutionInteractivity(root) {
        const charts = (root || document).querySelectorAll('.evo-chart[data-evo]');
        charts.forEach((chart) => {
            if (chart.dataset.evoBound === '1') return;
            chart.dataset.evoBound = '1';
            const config = JSON.parse(chart.dataset.evo);
            const svg = chart.querySelector('svg');
            const cursor = chart.querySelector('.evo-cursor');
            const tooltip = chart.querySelector('.evo-tooltip');
            const { points, granularity, width, height, padL, padR, padT, padB } = config;
            const innerW = width - padL - padR;
            const innerH = height - padT - padB;
            const n = points.length;
            const stepX = n > 1 ? innerW / (n - 1) : 0;

            const handleMove = (event) => {
                const rect = svg.getBoundingClientRect();
                const scaleX = width / rect.width;
                const x = (event.clientX - rect.left) * scaleX;
                if (x < padL || x > width - padR) {
                    cursor.setAttribute('opacity', '0');
                    tooltip.hidden = true;
                    return;
                }
                const idx = Math.max(0, Math.min(n - 1, Math.round((x - padL) / stepX)));
                const p = points[idx];
                const cx = padL + idx * stepX;
                const cy = padT + innerH * (1 - p.p / 100);
                cursor.setAttribute('x1', cx);
                cursor.setAttribute('x2', cx);
                cursor.setAttribute('opacity', '1');

                const date = new Date(p.d);
                const dd = String(date.getDate()).padStart(2, '0');
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const yy = date.getFullYear();
                const hh = String(date.getHours()).padStart(2, '0');
                const mi = String(date.getMinutes()).padStart(2, '0');
                const timeLabel = granularity === 'capture' ? `${dd}/${mm}/${yy} ${hh}:${mi}` : `${dd}/${mm}/${yy}`;
                const prev = idx > 0 ? points[idx - 1].p : null;
                const diff = prev !== null ? p.p - prev : 0;
                const diffStr = prev !== null ? `<span style="color:${diff > 0 ? '#027a48' : diff < 0 ? '#b42318' : '#53617a'}">${diff > 0 ? '+' : ''}${diff} pp vs anterior</span>` : '<span class="muted">Inicio del historial</span>';

                tooltip.innerHTML = `<strong>${escapeHtml(timeLabel)}</strong><br>Avance: <strong>${p.p}%</strong><br>${diffStr}`;
                tooltip.hidden = false;
                const tipLeft = (cx / width) * rect.width;
                const tipTop = (cy / height) * rect.height;
                tooltip.style.left = `${tipLeft}px`;
                tooltip.style.top = `${tipTop}px`;
            };

            const handleLeave = () => {
                cursor.setAttribute('opacity', '0');
                tooltip.hidden = true;
            };

            svg.addEventListener('mousemove', handleMove);
            svg.addEventListener('mouseleave', handleLeave);
            svg.addEventListener('touchstart', (e) => { if (e.touches[0]) handleMove(e.touches[0]); });
            svg.addEventListener('touchmove', (e) => { if (e.touches[0]) { handleMove(e.touches[0]); e.preventDefault(); } }, { passive: false });
            svg.addEventListener('touchend', handleLeave);
        });
    }

    function weekLabel(date, granularity) {
        const d = new Date(date);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        if (granularity === 'capture') {
            const hh = String(d.getHours()).padStart(2, '0');
            const mi = String(d.getMinutes()).padStart(2, '0');
            return `${dd}/${mm} ${hh}:${mi}`;
        }
        return `${dd}/${mm}`;
    }

    function percentTone(percent) {
        if (percent >= 80) return 'complete';
        if (percent >= 40) return 'progress';
        if (percent > 0) return 'issue';
        return 'pending';
    }

    function renderSlideBar(label, percent, detail, tone) {
        return `
            <div class="bar-row">
                <div class="bar-row__top"><span>${escapeHtml(label)}</span><strong>${escapeHtml(detail)}</strong></div>
                <div class="track track--${tone || 'complete'}"><span style="width:${percent}%"></span></div>
            </div>
        `;
    }

    async function downloadPdf() {
        if (!window.html2canvas || !window.jspdf?.jsPDF) return;
        const pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'in', format: [13.333, 7.5] });
        const slides = Array.from(els.reportDeck.querySelectorAll('.internal-slide'));
        await withBusy(els.pdfButton, 'Generando...', async () => {
            for (let index = 0; index < slides.length; index += 1) {
                if (index > 0) pdf.addPage([13.333, 7.5], 'landscape');
                const canvas = await window.html2canvas(slides[index], { scale: 1.5, backgroundColor: '#ffffff', useCORS: true });
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 13.333, 7.5, undefined, 'FAST');
            }
            saveBlob(pdf.output('blob'), 'reporte-interno-seguimiento.pdf', 'application/pdf');
        });
    }

    async function downloadPpt() {
        const PptxFactory = window.pptxgen || window.PptxGenJS;
        if (!window.html2canvas || !PptxFactory) return;
        const pptx = new PptxFactory();
        pptx.layout = 'LAYOUT_WIDE';
        pptx.author = 'DGMESNIE';
        const slides = Array.from(els.reportDeck.querySelectorAll('.internal-slide'));
        await withBusy(els.pptButton, 'Generando...', async () => {
            for (const node of slides) {
                const canvas = await window.html2canvas(node, { scale: 1.5, backgroundColor: '#ffffff', useCORS: true });
                const slide = pptx.addSlide();
                slide.addImage({ data: canvas.toDataURL('image/png'), x: 0, y: 0, w: 13.333, h: 7.5 });
            }
            await pptx.writeFile({ fileName: 'reporte-interno-seguimiento.pptx' });
        });
    }

    async function downloadExcel() {
        if (!window.ExcelJS) {
            setMessage('Librería Excel no cargada. Reintenta.', 'is-error');
            return;
        }
        await withBusy(els.excelButton, 'Generando...', async () => {
            const rows = state.filteredRows.slice().sort((a, b) =>
                a.projectName.localeCompare(b.projectName, 'es') || a.stage.localeCompare(b.stage, 'es')
            );
            const wb = new window.ExcelJS.Workbook();
            wb.creator = 'DGMESNIE';
            wb.created = new Date();
            const ws = wb.addWorksheet('Trámites por proyecto', {
                views: [{ state: 'frozen', ySplit: 5 }],
                pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
            });

            ws.columns = [
                { key: 'projectName', width: 38 },
                { key: 'stage', width: 32 },
                { key: 'procedureTitle', width: 36 },
                { key: 'status', width: 20 },
                { key: 'typeValue', width: 18 },
                { key: 'lastUpdate', width: 18 },
                { key: 'note', width: 50 }
            ];

            ws.mergeCells('A1:G1');
            const t = ws.getCell('A1');
            t.value = 'Reporte Interno · Seguimiento de Proyectos';
            t.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
            t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9B2247' } };
            t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
            ws.getRow(1).height = 30;

            ws.mergeCells('A2:G2');
            const s = ws.getCell('A2');
            s.value = 'DGMESNIE · Subsecretaría de Planeación y Transición Energética';
            s.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFA57F2C' } };
            s.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F7FA' } };
            s.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

            ws.mergeCells('A3:G3');
            const meta = ws.getCell('A3');
            const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
            meta.value = `Generado: ${today} · Registros: ${rows.length} · Proyectos: ${state.filteredProjects.length}`;
            meta.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF53617A' } };
            meta.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

            ws.getRow(4).height = 6;

            const headerRow = ws.getRow(5);
            headerRow.values = ['Proyecto', 'Etapa', 'Trámite', 'Estatus', 'Tipo', 'Última actualización', 'Comentario'];
            headerRow.height = 26;
            headerRow.eachCell((cell) => {
                cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9B2247' } };
                cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF7D1C39' } },
                    bottom: { style: 'medium', color: { argb: 'FFA57F2C' } },
                    left: { style: 'thin', color: { argb: 'FF7D1C39' } },
                    right: { style: 'thin', color: { argb: 'FF7D1C39' } }
                };
            });

            const modeFill = {
                complete: 'FFE6F4EE',
                progress: 'FFFCEBDC',
                issue: 'FFFBE4E2',
                pending: 'FFEEF1F4'
            };
            const modeFont = {
                complete: 'FF027A48',
                progress: 'FFB54708',
                issue: 'FFB42318',
                pending: 'FF53617A'
            };

            rows.forEach((row, index) => {
                const r = ws.addRow({
                    projectName: row.projectName,
                    stage: row.stage,
                    procedureTitle: row.procedureTitle,
                    status: row.status || 'Sin dato',
                    typeValue: row.typeValue || 'No aplica',
                    lastUpdate: row.lastUpdate || 'Sin fecha',
                    note: row.note || ''
                });
                const zebra = index % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
                r.eachCell({ includeEmpty: true }, (cell, col) => {
                    cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1F2937' } };
                    cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebra } };
                    cell.border = {
                        bottom: { style: 'thin', color: { argb: 'FFE5E9EF' } }
                    };
                    if (col === 1) cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1F2937' } };
                    if (col === 4) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: modeFill[row.mode] || zebra } };
                        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: modeFont[row.mode] || 'FF53617A' } };
                        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    }
                });
                r.height = Math.max(18, Math.min(80, 14 + Math.floor(String(row.note || '').length / 55) * 14));
            });

            ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: 7 } };

            const buffer = await wb.xlsx.writeBuffer();
            saveBlob(buffer, 'reporte-interno-tramites.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        });
    }

    async function withBusy(button, label, task) {
        const original = button.textContent;
        button.disabled = true;
        button.textContent = label;
        try {
            await task();
        } finally {
            button.disabled = false;
            button.textContent = original;
        }
    }

    function saveBlob(blob, fileName, type) {
        const url = URL.createObjectURL(new Blob([blob], { type }));
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function procedure(id, title, statusColumn, detailColumn, summaryColumn, extra) {
        return Object.assign({ id, title, statusColumn, detailColumn, summaryColumn, statusOptions: statusOptionSets.defaultTerritory }, extra || {});
    }

    function statusOptions() {
        return [option('', '')].concat(Array.from(arguments));
    }

    function option(label, mode) {
        return { label, value: label, mode };
    }

    function getAllProcedures() {
        return sections.reduce((items, section) => items.concat(section.procedures), []);
    }

    function getStatusMode(item, value) {
        const normalized = normalize(value);
        const match = (item.statusOptions || []).find((statusOption) => normalize(statusOption.value) === normalized);
        if (match) return match.mode;
        if (['aprobado', 'aprobada', 'liberado', 'entregado', 'firmado', 'realizada'].includes(normalized)) return STATUS_COMPLETE;
        if (['pendiente', 'en elaboracion', 'en proceso'].includes(normalized)) return STATUS_PROGRESS;
        if (['otro', 'otros', 'detenido'].includes(normalized)) return STATUS_ISSUE;
        return '';
    }

    function readRecordColumn(record, column) {
        if (!record || !Array.isArray(record.rowValues) || !column) return '';
        return String(record.rowValues[column - 1] || '').trim();
    }

    function parseDelimitedRows(text, delimiter) {
        const rows = [];
        let row = [];
        let cell = '';
        let inQuotes = false;
        for (let index = 0; index < text.length; index += 1) {
            const char = text[index];
            const next = text[index + 1];
            if (char === '"') {
                if (inQuotes && next === '"') {
                    cell += '"';
                    index += 1;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }
            if (char === delimiter && !inQuotes) {
                row.push(cell);
                cell = '';
                continue;
            }
            if ((char === '\n' || char === '\r') && !inQuotes) {
                if (char === '\r' && next === '\n') index += 1;
                row.push(cell);
                rows.push(row);
                row = [];
                cell = '';
                continue;
            }
            cell += char;
        }
        row.push(cell);
        rows.push(row);
        return rows;
    }

    function ensureRowLength(row) {
        const values = row.slice(0, TOTAL_COLUMNS);
        while (values.length < TOTAL_COLUMNS) values.push('');
        return values;
    }

    function findHeaderIndex(normalizedHeaders, acceptedNames) {
        const exactIndex = normalizedHeaders.findIndex((header) => acceptedNames.some((name) => header === normalize(name)));
        if (exactIndex >= 0) return exactIndex;
        return normalizedHeaders.findIndex((header) => acceptedNames.some((name) => header.includes(normalize(name))));
    }

    function extractProjectName(row, projectIndex) {
        const byHeader = readCell(row, projectIndex);
        if (byHeader) return byHeader;
        const fixedColumn = readCell(row, DUPLICATE_COLUMN_INDEX);
        if (fixedColumn) return fixedColumn;
        const fallback = readCell(row, FALLBACK_DUPLICATE_INDEX);
        return fallback && !looksLikeDate(fallback) ? fallback : '';
    }

    function extractReportDate(row, reportDateIndex, timestamp) {
        const byHeader = readCell(row, reportDateIndex);
        if (looksLikeDate(byHeader)) return byHeader;
        const fallback = readCell(row, 1);
        if (looksLikeDate(fallback)) return fallback;
        return timestamp || '';
    }

    function readCell(row, index) {
        if (index < 0 || index >= row.length) return '';
        return String(row[index] || '').trim();
    }

    function looksLikeDate(value) {
        return /^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}/.test(String(value || '').trim());
    }

    function unique(values) {
        return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'));
    }

    function setMessage(message, className) {
        els.statusMessage.textContent = message;
        els.statusMessage.className = `status-message ${className || ''}`.trim();
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/`/g, '&#96;');
    }

    function normalize(value) {
        return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
    }
})();
