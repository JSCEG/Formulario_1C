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
        }
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
        reportDeck: document.getElementById('internal-report-deck')
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
        renderDetailTable(state.filteredRows);
        renderReportDeck(summary);
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
        els.detailTableBody.innerHTML = sorted.length ? sorted.map((row) => `
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
            sourceRows: project.sourceRows
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
                sourceRows: projectRecords.length
            };
        });
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
                percent: total ? Math.round((completed / total) * 100) : 0,
                detail: `${completed}/${total}`
            };
        });
        const detailRows = rows.slice(0, 12);

        return `
            <section class="internal-slide internal-slide--content internal-slide--project">
                ${renderSlideHeader('Detalle por proyecto')}
                <div class="internal-slide__body">
                    <div class="project-slide-head">
                        <div>
                            <p>Proyecto</p>
                            <h2>${escapeHtml(project.projectName)}</h2>
                            <span>${project.sourceRows} capturas históricas · Última actualización: ${escapeHtml(project.lastUpdate || 'Sin fecha')}</span>
                        </div>
                        <strong>${project.percent}%</strong>
                    </div>
                    <div class="slide-kpis slide-kpis--project">
                        ${renderSlideKpi('Concluidos', complete)}
                        ${renderSlideKpi('En proceso', progress)}
                        ${renderSlideKpi('Incidencias', issue)}
                        ${renderSlideKpi('Sin dato', pending)}
                    </div>
                    <div class="slide-grid slide-grid--project">
                        <div>
                            <h3>Avance por etapa</h3>
                            ${stageRows.map((stage) => renderSlideBar(stage.title, stage.percent, `${stage.percent}% · ${stage.detail}`, 'complete')).join('')}
                        </div>
                        <div>
                            <h3>Trámites incluidos en el filtro</h3>
                            <table class="slide-table slide-table--compact">
                                <thead><tr><th>Trámite</th><th>Estatus</th><th>Tipo</th></tr></thead>
                                <tbody>
                                    ${detailRows.length ? detailRows.map((row) => `
                                        <tr>
                                            <td>${escapeHtml(row.procedureTitle)}</td>
                                            <td>${escapeHtml(row.status || 'Sin dato')}</td>
                                            <td>${escapeHtml(row.typeValue || 'No aplica')}</td>
                                        </tr>
                                    `).join('') : '<tr><td colspan="3">Sin trámites para el filtro actual.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                ${renderSlideFooter()}
            </section>
        `;
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

    function renderSlideKpi(label, value) {
        return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
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
