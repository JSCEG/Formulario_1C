(function () {
    const SHEET_READ_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRPZHXFcFuVRHH2gV5lyTSR3BKyZ3C1KyWVDLs5U_NBnvmqecRKa1-BVXNxCy4UkTQaH1HamMW_c7Q_/pub?gid=1770165044&single=true&output=tsv';
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwO8XoBc69NHZWPviaSOq15PFyERfhb3jHQGzM8SdV3LkGMUd_AptlTVLv-E4gqCnpTKg/exec';
    const DUPLICATE_COLUMN_INDEX = 38;
    const FALLBACK_DUPLICATE_INDEX = 1;
    const TOTAL_COLUMNS = 58;
    const PROJECT_HEADER_NAMES = ['nombre del proyecto'];
    const TIMESTAMP_HEADER_NAMES = ['marca temporal', 'timestamp'];
    const REPORT_DATE_HEADER_NAMES = ['fecha'];
    const PROJECT_URL_PARAM = 'proyecto';
    const TRACKING_KEY_URL_PARAM = 'clave';

    const STATUS_COMPLETE = 'complete';
    const STATUS_PROGRESS = 'progress';
    const STATUS_ISSUE = 'issue';

    const statusOptionSets = {
        guarantees: statusOptions(
            option('Entregado', STATUS_COMPLETE),
            option('Pendiente', STATUS_PROGRESS),
            option('Otro', STATUS_ISSUE)
        ),
        interconnection: statusOptions(
            option('Firmado', STATUS_COMPLETE),
            option('Pendiente', STATUS_PROGRESS),
            option('Otro', STATUS_ISSUE)
        ),
        misse: statusOptions(
            option('Aprobada', STATUS_COMPLETE),
            option('En elaboracion', STATUS_PROGRESS),
            option('Otro', STATUS_ISSUE)
        ),
        consultation: statusOptions(
            option('Realizada', STATUS_COMPLETE),
            option('En proceso', STATUS_PROGRESS),
            option('Otro', STATUS_ISSUE)
        ),
        mia: statusOptions(
            option('Aprobada', STATUS_COMPLETE),
            option('En proceso', STATUS_PROGRESS),
            option('Otro', STATUS_ISSUE)
        ),
        etj: statusOptions(
            option('Aprobado', STATUS_COMPLETE),
            option('En elaboracion', STATUS_PROGRESS),
            option('Otro', STATUS_ISSUE)
        ),
        defaultTerritory: statusOptions(
            option('Liberado', STATUS_COMPLETE),
            option('En proceso', STATUS_PROGRESS),
            option('Otro', STATUS_ISSUE)
        ),
        municipality: statusOptions(
            option('Liberado', STATUS_COMPLETE),
            option('En proceso', STATUS_PROGRESS),
            option('Otros', STATUS_ISSUE)
        ),
        easement: statusOptions(
            option('Liberado', STATUS_COMPLETE),
            option('En proceso', STATUS_PROGRESS),
            option('Otros', STATUS_ISSUE)
        )
    };

    const miaTypeOptions = [
        '',
        'MIA',
        'MIA/ETJ',
        'MIA Poligono principal',
        'MIA Poligono principal + Linea de Transmision',
        'MIA Linea de Transmision',
        'MIA/ETJ Linea de Transmision'
    ];

    const etjTypeOptions = [
        '',
        'ETJ Linea de Transmision',
        'ETJ Poligono principal',
        'ETJ Poligono Principal + Linea de Transmision'
    ];

    const sections = [
        {
            id: 'general',
            title: 'Datos generales',
            description: 'Información principal que se usa para validación, control de duplicados y clasificación del proyecto.',
            type: 'general',
            fields: [
                { key: 'reportDate', label: 'Fecha de reporte', control: 'input', inputType: 'date', required: true, column: 2, hint: 'Se guardará en la columna Fecha de la hoja de concentrado.' },
                { key: 'projectName', label: 'Nombre del proyecto', control: 'input', inputType: 'text', required: true, minLength: 5, column: 39, hint: 'Se usa como llave principal para identificar el proyecto.' }
            ]
        },
        {
            id: 'core-permits',
            title: 'Trámites estratégicos',
            description: 'Trámites base vinculados a garantías, interconexión, MISSE y componente ambiental.',
            type: 'procedures',
            procedures: [
                procedure('guarantees', 'Pago de garantías', 3, 4, 40, { statusOptions: statusOptionSets.guarantees, statusLabel: '¿Cuál es el estatus del pago de garantías?' }),
                procedure('interconnection', 'Contrato de interconexión', 5, 6, 41, { statusOptions: statusOptionSets.interconnection, statusLabel: 'Estatus de la firma del contrato de interconexión' }),
                procedure('misse', 'MISSE/EVIS', 7, 8, 42, { statusOptions: statusOptionSets.misse, statusLabel: 'Estatus del tramite MISSE/EVIS' }),
                procedure('consultation', 'Consulta previa libre e informada', 9, 10, 43, { statusOptions: statusOptionSets.consultation, statusLabel: 'Estatus de la consulta previa libre e informada' }),
                procedure('mia', 'Manifestacion de Impacto Ambiental', 12, 13, 44, { statusOptions: statusOptionSets.mia, statusLabel: 'Estatus del tramite de la Manifestacion de Impacto Ambiental', typeColumn: 11, typeLabel: 'Tipo de MIA', typeOptions: miaTypeOptions }),
                procedure('etj', 'Estudio Tecnico Justificativo', 15, 16, 45, { statusOptions: statusOptionSets.etj, statusLabel: 'Estatus del tramite del Estudio Tecnico Justificativo', typeColumn: 14, typeLabel: 'Tipo de ETJ', typeOptions: etjTypeOptions })
            ]
        },
        {
            id: 'territory',
            title: 'Permisos territoriales y sectoriales',
            description: 'Seguimiento de gestiones ante instancias sectoriales y disponibilidad fisica del proyecto.',
            type: 'procedures',
            procedures: [
                procedure('inah', 'Trámites ante INAH', 17, 18, 46),
                procedure('conagua', 'Trámites ante CONAGUA', 19, 20, 47),
                procedure('conafor', 'Trámites ante CONAFOR', 21, 22, 48),
                procedure('sedatu', 'Trámites ante SEDATU', 23, 24, 49),
                procedure('land-possession', 'Posesion de terrenos', 25, 26, 50),
                procedure('construction-license', 'Licencia de construccion', 27, 28, 51)
            ]
        },
        {
            id: 'closure',
            title: 'Infraestructura y cierre operativo',
            description: 'Última sección para trámites municipales, servidumbres, derecho de vía, obras de refuerzo y procura.',
            type: 'procedures',
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
        projectNames: new Set(),
        loadingSheet: true,
        isSubmitting: false,
        hasAppsScript: false,
        existingRows: 0,
        sheetRecords: [],
        latestProjectRecord: null,
        trackingProjectName: '',
        trackingKey: '',
        trackingAccessValid: false,
        formLocked: false,
        currentStep: 0
    };

    const form = document.getElementById('convocatoria-form');
    const sectionsContainer = document.getElementById('form-sections');
    const globalMessage = document.getElementById('global-message');
    const progressDashboard = document.getElementById('progress-dashboard');
    const reportDeckPanel = document.getElementById('report-deck-panel');
    const reportDeck = document.getElementById('report-deck');
    const closeReportButton = document.getElementById('close-report-button');
    const downloadPdfButton = document.getElementById('download-pdf-button');
    const submitButton = document.getElementById('submit-button');
    const projectNameOptions = document.getElementById('projectNameOptions');
    const stepper = document.getElementById('form-stepper');
    const prevStepButton = document.getElementById('prev-step-button');
    const nextStepButton = document.getElementById('next-step-button');
    init();

    function procedure(id, title, statusColumn, detailColumn, summaryColumn, extra) {
        return Object.assign({ id, title, statusColumn, detailColumn, summaryColumn, statusOptions: statusOptionSets.defaultTerritory }, extra || {});
    }

    function statusOptions() {
        return [option('', '')].concat(Array.from(arguments));
    }

    function option(label, mode) {
        return { label, value: label, mode };
    }

    function init() {
        state.hasAppsScript = typeof APPS_SCRIPT_URL === 'string' && APPS_SCRIPT_URL.trim().length > 0;
        renderForm();
        resetConditionalDetails();
        initializeDates();
        renderStepper();
        showStep(0);
        attachEvents();
        configureTrackingLink();
        loadSheetRecords();
    }

    function renderForm() {
        sectionsContainer.innerHTML = sections.map(renderSection).join('');
    }

    function renderSection(section) {
        if (section.type === 'general') {
            return `
                <section class="form-section" id="section-${section.id}">
                    <div class="form-section__header">
                        <div>
                            <h3 class="form-section__title">${escapeHtml(section.title)}</h3>
                        </div>
                    </div>
                    <div class="general-grid">
                        ${section.fields.map(renderField).join('')}
                    </div>
                </section>
            `;
        }

        return `
            <section class="form-section" id="section-${section.id}">
                <div class="form-section__header">
                    <div>
                        <h3 class="form-section__title">${escapeHtml(section.title)}</h3>
                    </div>
                </div>
                <div class="procedure-grid">
                    ${section.procedures.map(renderProcedureCard).join('')}
                </div>
            </section>
        `;
    }

    function renderProcedureCard(item) {
        return `
            <article class="procedure-card" data-procedure-id="${item.id}">
                <div class="procedure-card__heading">
                    <h4 class="procedure-card__title">${escapeHtml(item.title)}</h4>
                    <span class="procedure-status-badge" data-procedure-status>Sin avance</span>
                </div>
                <div class="procedure-card__grid">
                    ${item.typeColumn ? renderField({ key: `${item.id}Type`, label: item.typeLabel, control: 'select', required: true, options: item.typeOptions, column: item.typeColumn, hint: 'Selecciona el tipo tramitado para este proyecto.' }) : ''}
                    ${renderField({ key: `${item.id}Status`, label: item.statusLabel || 'Estatus del tramite', control: 'select', required: true, options: item.statusOptions, column: item.statusColumn, procedureId: item.id, hint: 'Selecciona el avance reportado al momento del llenado.' })}
                    ${renderField({ key: `${item.id}CurrentSituation`, label: 'Describe la situacion actual en que se encuentra este tramite', control: 'textarea', required: false, minLength: 10, column: item.summaryColumn, procedureId: item.id, conditionalOn: `${item.id}Status`, conditionalMode: STATUS_PROGRESS, full: true, hint: 'Se vuelve obligatorio cuando el tramite esta pendiente, en elaboracion o en proceso.' })}
                    ${renderField({ key: `${item.id}Detail`, label: 'En caso de que este tramite se encuentre detenido, describe la situacion', control: 'textarea', required: false, minLength: 10, column: item.detailColumn, procedureId: item.id, conditionalOn: `${item.id}Status`, conditionalMode: STATUS_ISSUE, full: true, hint: 'Se vuelve obligatorio cuando el estatus es Otro u Otros.' })}
                </div>
            </article>
        `;
    }

    function renderField(field) {
        const className = ['field'];
        if (field.full) {
            className.push('field--full');
        }
        const editButton = canEditPrefilledField(field.key)
            ? `
                    <button class="field__edit-button" type="button" data-edit-field="${field.key}" title="Editar campo" aria-label="Editar ${escapeAttribute(field.label)}" hidden>
                        <span aria-hidden="true">✎</span>
                        <span>Editar</span>
                    </button>`
            : '';

        return `
            <div class="${className.join(' ')}" data-field-key="${field.key}" ${field.conditionalOn ? `data-conditional-on="${field.conditionalOn}"` : ''} ${field.conditionalMode ? `data-conditional-mode="${field.conditionalMode}"` : ''}>
                <label class="field__label" for="${field.key}">
                    <span>${escapeHtml(field.label)}</span>
                    ${field.required ? '<span class="field__required">*</span>' : ''}
                    ${editButton}
                </label>
                <div class="field__control-wrap">
                    ${renderControl(field)}
                </div>
                <span class="field__error" aria-live="polite"></span>
            </div>
        `;
    }

    function renderControl(field) {
        if (field.control === 'select') {
            return `
                <select class="field__select" id="${field.key}" name="${field.key}" data-column="${field.column}" ${field.required ? 'required' : ''}>
                    ${field.options.map((item) => {
                        const normalizedOption = normalizeOption(item);
                        return `<option value="${escapeAttribute(normalizedOption.value)}" data-mode="${escapeAttribute(normalizedOption.mode)}">${escapeHtml(normalizedOption.label || 'Selecciona una opcion')}</option>`;
                    }).join('')}
                </select>
            `;
        }

        if (field.control === 'textarea') {
            const required = field.required ? 'required' : '';
            const minLength = field.minLength ? ` minlength="${field.minLength}"` : '';
            return `<textarea class="field__textarea" id="${field.key}" name="${field.key}" data-column="${field.column}" ${required}${minLength}></textarea>`;
        }

        const required = field.required ? 'required' : '';
        const minLength = field.minLength ? ` minlength="${field.minLength}"` : '';
        const list = field.key === 'projectName' ? ' list="projectNameOptions"' : '';
        return `<input class="field__control" id="${field.key}" name="${field.key}" type="${field.inputType || 'text'}" data-column="${field.column}" ${required}${minLength}${list}>`;
    }

    function attachEvents() {
        form.addEventListener('input', handleFieldChange);
        form.addEventListener('change', handleFieldChange);
        form.addEventListener('click', handleFieldEditClick);
        form.addEventListener('submit', handleSubmit);
        prevStepButton.addEventListener('click', goToPreviousStep);
        nextStepButton.addEventListener('click', goToNextStep);
        if (closeReportButton) {
            closeReportButton.addEventListener('click', hideReportDeck);
        }
        if (downloadPdfButton) {
            downloadPdfButton.addEventListener('click', downloadReportPdf);
        }
    }

    function configureTrackingLink() {
        const params = new URLSearchParams(window.location.search);
        state.trackingProjectName = (params.get(PROJECT_URL_PARAM) || '').trim();
        state.trackingKey = (params.get(TRACKING_KEY_URL_PARAM) || '').trim();

        const projectField = document.getElementById('projectName');
        if (state.trackingProjectName && projectField instanceof HTMLInputElement) {
            lockTrackingProjectField(projectField);
        }

        if (!state.trackingProjectName || !state.trackingKey) {
            state.trackingAccessValid = false;
            setFormLocked(true);
            setGlobalMessage('Liga de seguimiento no válida. Abre el formulario desde la liga enviada para tu proyecto.', 'error');
            return;
        }

        state.trackingAccessValid = true;
        setGlobalMessage('Validando liga de seguimiento...', 'warning');
        validateTrackingAccess();
    }

    async function validateTrackingAccess() {
        if (!state.hasAppsScript) {
            return;
        }

        try {
            const url = `${APPS_SCRIPT_URL}?action=validate&projectName=${encodeURIComponent(state.trackingProjectName)}&trackingKey=${encodeURIComponent(state.trackingKey)}&cacheBust=${Date.now()}`;
            const response = await fetch(url, { cache: 'no-store' });
            const data = await response.json();
            if (!response.ok || !data.ok || data.validProjectLink !== true) {
                throw new Error('La liga de seguimiento no es valida para este proyecto.');
            }

            state.trackingAccessValid = true;
            setFormLocked(false);
            setGlobalMessage('', 'info');
            applyProjectContext();
            validateProjectField();
        } catch (error) {
            state.trackingAccessValid = false;
            setFormLocked(true);
            setGlobalMessage(error.message || 'La liga de seguimiento no es valida.', 'error');
        }
    }

    function restoreTrackingProjectField() {
        const projectField = document.getElementById('projectName');
        if (state.trackingProjectName && projectField instanceof HTMLInputElement) {
            lockTrackingProjectField(projectField);
        }
        lockReportDateField();
    }

    function lockTrackingProjectField(projectField) {
        projectField.value = state.trackingProjectName;
        projectField.readOnly = true;
        projectField.setAttribute('aria-readonly', 'true');
        projectField.title = 'Proyecto asignado por liga de seguimiento';
        projectField.removeAttribute('list');
    }

    function enforceTrackingProjectName() {
        const projectField = document.getElementById('projectName');
        if (state.trackingProjectName && projectField instanceof HTMLInputElement && projectField.value !== state.trackingProjectName) {
            lockTrackingProjectField(projectField);
        }
    }

    function setFormLocked(locked) {
        state.formLocked = locked;
        Array.from(form.querySelectorAll('input, select, textarea, button')).forEach((field) => {
            if (field.id === 'projectName' && state.trackingProjectName) {
                field.disabled = false;
                field.readOnly = true;
                return;
            }

            if (field.id === 'prev-step-button' || field.id === 'next-step-button' || field.id === 'submit-button' || field.dataset.column) {
                field.disabled = locked;
            }
        });
        updateNavigationState();
    }

    async function loadSheetRecords() {
        try {
            const response = await fetch(`${SHEET_READ_URL}&cacheBust=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`No se pudo consultar la hoja publicada (${response.status}).`);
            }

            const content = await response.text();
            const table = parseDelimitedRows(content, '\t').filter((row) => row.some((cell) => String(cell || '').trim()));
            const headers = table[0] || [];
            const rows = table.slice(1);
            state.existingRows = rows.length;
            state.sheetRecords = buildSheetRecords(headers, rows);

            state.sheetRecords.forEach((record) => {
                const projectKey = normalize(record.projectName);
                if (projectKey) {
                    state.projectNames.add(projectKey);
                }
            });

            state.loadingSheet = false;
            renderProjectOptions();
            applyProjectContext();
            validateProjectField();
        } catch (error) {
            state.loadingSheet = false;
        }
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
            return {
                projectName,
                timestamp,
                reportDate,
                rowValues: ensureRowLength(row)
            };
        }).filter((record) => record.projectName);
    }

    function ensureRowLength(row) {
        const values = row.slice(0, TOTAL_COLUMNS);
        while (values.length < TOTAL_COLUMNS) {
            values.push('');
        }
        return values;
    }

    function initializeDates() {
        const reportDateField = document.getElementById('reportDate');
        if (reportDateField instanceof HTMLInputElement && !reportDateField.value) {
            reportDateField.value = formatDateInput(new Date());
        }
        lockReportDateField();

    }

    function lockReportDateField() {
        const reportDateField = document.getElementById('reportDate');
        if (reportDateField instanceof HTMLInputElement) {
            reportDateField.value = formatDateInput(new Date());
            reportDateField.readOnly = true;
            reportDateField.setAttribute('aria-readonly', 'true');
            reportDateField.title = 'Fecha generada automaticamente';
        }
    }

    function renderStepper() {
        if (!stepper) {
            return;
        }

        stepper.innerHTML = sections.map((section, index) => `
            <button type="button" class="stepper__item" data-step="${index}" aria-current="${index === state.currentStep ? 'step' : 'false'}" ${isSectionAvailable(index) ? '' : 'hidden'}>
                <span>${index + 1}</span>
                ${escapeHtml(section.title)}
            </button>
        `).join('');

        stepper.querySelectorAll('[data-step]').forEach((button) => {
            button.addEventListener('click', () => {
                const nextStep = Number(button.dataset.step);
                if (nextStep <= state.currentStep || (nextStep === state.currentStep + 1 && validateCurrentStep())) {
                    showStep(nextStep);
                }
            });
        });
    }

    function showStep(index) {
        const boundedIndex = Math.max(0, Math.min(index, sections.length - 1));
        state.currentStep = isSectionAvailable(boundedIndex) ? boundedIndex : findNextVisibleStep(boundedIndex);

        sections.forEach((section, sectionIndex) => {
            const sectionNode = document.getElementById(`section-${section.id}`);
            if (sectionNode) {
                sectionNode.hidden = sectionIndex !== state.currentStep;
            }
        });

        if (stepper) {
            stepper.querySelectorAll('[data-step]').forEach((button) => {
                const isCurrent = Number(button.dataset.step) === state.currentStep;
                button.classList.toggle('is-active', isCurrent);
                button.setAttribute('aria-current', isCurrent ? 'step' : 'false');
            });
        }

        updateNavigationState();
    }

    function goToPreviousStep() {
        showStep(findPreviousVisibleStep(state.currentStep - 1));
    }

    function goToNextStep() {
        if (!validateCurrentStep()) {
            setGlobalMessage('Completa los campos marcados antes de continuar.', 'error');
            focusFirstInvalid();
            return;
        }

        showStep(findNextVisibleStep(state.currentStep + 1));
    }

    function updateNavigationState() {
        if (!prevStepButton || !nextStepButton || !submitButton) {
            return;
        }

        const isFirstStep = state.currentStep === 0;
        const nextStep = findNextVisibleStep(state.currentStep + 1);
        const isLastStep = nextStep <= state.currentStep;
        prevStepButton.disabled = state.formLocked || isFirstStep || state.isSubmitting;
        nextStepButton.hidden = isLastStep;
        submitButton.hidden = !isLastStep;
        updateSubmitState();
    }

    function validateCurrentStep() {
        const section = sections[state.currentStep];
        const sectionNode = section ? document.getElementById(`section-${section.id}`) : null;
        if (!sectionNode) {
            return true;
        }

        const fields = Array.from(sectionNode.querySelectorAll('input, select, textarea'));
        let allValid = true;
        fields.forEach((field) => {
            if (!validateField(field)) {
                allValid = false;
            }
        });

        return allValid;
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
                if (char === '\r' && next === '\n') {
                    index += 1;
                }
                row.push(cell);
                rows.push(row);
                row = [];
                cell = '';
                continue;
            }

            cell += char;
        }

        if (cell || row.length) {
            row.push(cell);
            rows.push(row);
        }

        return rows;
    }

    function findHeaderIndex(normalizedHeaders, acceptedNames) {
        const exactIndex = normalizedHeaders.findIndex((header) => acceptedNames.some((name) => header === normalize(name)));
        if (exactIndex >= 0) {
            return exactIndex;
        }

        return normalizedHeaders.findIndex((header) => acceptedNames.some((name) => header.includes(normalize(name))));
    }

    function extractProjectName(row, projectIndex) {
        const byHeader = readCell(row, projectIndex);
        if (byHeader) {
            return byHeader;
        }

        const fixedColumn = readCell(row, DUPLICATE_COLUMN_INDEX);
        if (fixedColumn) {
            return fixedColumn;
        }

        const fallback = readCell(row, FALLBACK_DUPLICATE_INDEX);
        if (fallback && !looksLikeDate(fallback)) {
            return fallback;
        }

        return '';
    }

    function extractReportDate(row, reportDateIndex, timestamp) {
        const byHeader = readCell(row, reportDateIndex);
        if (looksLikeDate(byHeader)) {
            return byHeader;
        }

        const fallback = readCell(row, 1);
        if (looksLikeDate(fallback)) {
            return fallback;
        }

        return timestamp || '';
    }

    function readCell(row, index) {
        if (index < 0 || index >= row.length) {
            return '';
        }
        return String(row[index] || '').trim();
    }

    function renderProjectOptions() {
        if (!projectNameOptions) {
            return;
        }
        projectNameOptions.innerHTML = state.sheetRecords
            .map((record) => record.projectName)
            .filter(Boolean)
            .slice(0, 100)
            .map((projectName) => `<option value="${escapeAttribute(projectName)}"></option>`)
            .join('');
    }

    function handleFieldChange(event) {
        const field = event.target;
        if (!(field instanceof HTMLElement)) {
            return;
        }

        if (field.id === 'projectName' || field.id === 'reportDate') {
            if (field.id === 'projectName') {
                enforceTrackingProjectName();
                applyProjectContext();
            }
            validateProjectField();
        }

        if (field.id.endsWith('Status')) {
            toggleConditionalFields(field.id);
            warnIfCompleteStatusWasDowngraded(field);
        }

        validateField(field);
    }

    function handleFieldEditClick(event) {
        const button = event.target.closest('[data-edit-field]');
        if (!(button instanceof HTMLButtonElement)) {
            return;
        }

        const field = document.getElementById(button.dataset.editField);
        if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) {
            return;
        }

        unlockPrefilledField(field);
    }

    function toggleConditionalFields(statusFieldId) {
        const statusField = document.getElementById(statusFieldId);
        if (!(statusField instanceof HTMLSelectElement)) {
            return;
        }

        const selectedOption = statusField.selectedOptions[0];
        const selectedMode = selectedOption ? selectedOption.dataset.mode : '';
        const fields = sectionsContainer.querySelectorAll(`[data-conditional-on="${statusFieldId}"]`);

        fields.forEach((wrapper) => {
            const field = wrapper.querySelector('textarea, input, select');
            if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) {
                return;
            }

            const isActive = wrapper.dataset.conditionalMode === selectedMode;
            const isPrefilled = field.dataset.prefilled === 'true';
            field.required = isActive && !isPrefilled;
            field.disabled = !isActive || isPrefilled;
            wrapper.hidden = !isActive;
            wrapper.classList.toggle('is-disabled', !isActive);
            if (!isActive) {
                field.value = '';
                clearFieldError(field);
            }
        });
    }

    function normalizeOption(item) {
        if (item && typeof item === 'object') {
            return {
                label: item.label || item.value || '',
                value: item.value || item.label || '',
                mode: item.mode || ''
            };
        }

        return {
            label: item || '',
            value: item || '',
            mode: ''
        };
    }

    function applyProjectContext() {
        const projectField = document.getElementById('projectName');
        const projectKey = normalize(projectField ? projectField.value : '');
        state.latestProjectRecord = findLatestProjectRecord(projectKey);

        clearProcedureValues();
        resetProcedureVisibility();
        prefillProjectValues(state.latestProjectRecord);
        renderProgressDashboard();

        if (!state.latestProjectRecord) {
            resetConditionalDetails();
            renderStepper();
            showStep(Math.min(state.currentStep, sections.length - 1));
            return;
        }

        sections.forEach((section) => {
            if (section.type !== 'procedures') {
                return;
            }

            section.procedures.forEach((item) => {
                const status = readRecordColumn(state.latestProjectRecord, item.statusColumn);
                const mode = getStatusMode(item, status);
                const card = sectionsContainer.querySelector(`[data-procedure-id="${item.id}"]`);
                if (!card) {
                    return;
                }

                prefillProcedure(item, state.latestProjectRecord);
                setProcedureCardStatus(card, mode, Boolean(status));
            });
        });

        resetConditionalDetails();
        renderStepper();
        showStep(findNextVisibleStep(0));
    }

    function renderProgressDashboard() {
        if (!progressDashboard) {
            return;
        }

        if (!state.latestProjectRecord) {
            progressDashboard.hidden = true;
            progressDashboard.innerHTML = '';
            return;
        }

        const summary = getProgressSummary(state.latestProjectRecord);
        const projectName = state.latestProjectRecord.projectName || state.trackingProjectName || 'Proyecto';
        progressDashboard.hidden = false;
        progressDashboard.innerHTML = `
            <div class="progress-dashboard__shell">
                <aside class="progress-dashboard__side">
                    <p class="progress-dashboard__eyebrow">Seguimiento activo</p>
                    <h3>${escapeHtml(projectName)}</h3>
                    <div class="progress-dashboard__chart" aria-label="Avance ${summary.percent}%">
                        <div id="progress-donut-chart" class="progress-donut-chart" data-percent="${summary.percent}">
                            <strong>${summary.percent}%</strong>
                            <span>avance</span>
                        </div>
                    </div>
                    <div class="progress-dashboard__meta">
                        <span>${summary.total} trámites</span>
                        <span>${summary.sourceRows} capturas históricas</span>
                        <span>${escapeHtml(summary.lastUpdate)}</span>
                    </div>
                    <div class="progress-dashboard__pending">
                        <strong>Siguientes pendientes</strong>
                        <span>${escapeHtml(summary.pendingPreview)}</span>
                    </div>
                </aside>
                <div class="progress-dashboard__main">
                    <div class="progress-dashboard__header">
                        <div>
                            <p class="progress-dashboard__eyebrow">Estatus de proyecto</p>
                            <h3>Tablero de avance</h3>
                            <p>Última versión cargada: ${escapeHtml(summary.lastUpdate)}. ${summary.pending} pendientes por actualizar.</p>
                        </div>
                        <div class="progress-dashboard__actions">
                            <button type="button" class="dashboard-action" data-report-action="open">Ver reporte</button>
                            <button type="button" class="dashboard-action dashboard-action--primary" data-report-action="pdf">PDF</button>
                        </div>
                    </div>
                    <div class="progress-dashboard__metrics" aria-label="Resumen de avance">
                        ${renderProgressMetric('Concluidos', summary.completed, summary.total, 'complete')}
                        ${renderProgressMetric('En proceso', summary.progress, summary.total, 'progress')}
                        ${renderProgressMetric('Incidencias', summary.issue, summary.total, 'issue')}
                        ${renderProgressMetric('Pendientes', summary.pending, summary.total, 'pending')}
                    </div>
                    <div id="progress-status-chart" class="progress-status-chart" aria-label="Distribución por estado"></div>
                    <div class="progress-dashboard__stages" aria-label="Avance por etapa">
                        ${summary.stages.map(renderStageProgressCard).join('')}
                    </div>
                </div>
            </div>
        `;
        progressDashboard.querySelector('[data-report-action="open"]')?.addEventListener('click', showReportDeck);
        progressDashboard.querySelector('[data-report-action="pdf"]')?.addEventListener('click', async () => {
            showReportDeck();
            await downloadReportPdf();
        });
        renderD3DashboardCharts(summary);
    }

    function renderD3DashboardCharts(summary) {
        if (!window.d3 || !progressDashboard) {
            return;
        }

        renderD3DonutChart(summary);
        renderD3StatusChart(summary);
    }

    function renderD3DonutChart(summary) {
        const target = progressDashboard.querySelector('#progress-donut-chart');
        if (!target) {
            return;
        }

        target.innerHTML = '';
        const size = 118;
        const strokeWidth = 13;
        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference * (1 - summary.percent / 100);
        const svg = window.d3.select(target)
            .append('svg')
            .attr('viewBox', `0 0 ${size} ${size}`)
            .attr('role', 'img')
            .attr('aria-label', `Avance ${summary.percent}%`);

        svg.append('circle')
            .attr('cx', size / 2)
            .attr('cy', size / 2)
            .attr('r', radius)
            .attr('fill', 'none')
            .attr('stroke', 'rgba(15, 23, 42, 0.1)')
            .attr('stroke-width', strokeWidth);

        svg.append('circle')
            .attr('cx', size / 2)
            .attr('cy', size / 2)
            .attr('r', radius)
            .attr('fill', 'none')
            .attr('stroke', 'var(--gobmx-guinda)')
            .attr('stroke-width', strokeWidth)
            .attr('stroke-linecap', 'round')
            .attr('stroke-dasharray', circumference)
            .attr('stroke-dashoffset', circumference)
            .attr('transform', `rotate(-90 ${size / 2} ${size / 2})`)
            .transition()
            .duration(650)
            .attr('stroke-dashoffset', offset);

        const label = window.d3.select(target).append('div').attr('class', 'progress-donut-chart__label');
        label.append('strong').text(`${summary.percent}%`);
        label.append('span').text('avance');
    }

    function renderD3StatusChart(summary) {
        const target = progressDashboard.querySelector('#progress-status-chart');
        if (!target) {
            return;
        }

        target.innerHTML = '';
        const data = [
            { label: 'Concluidos', value: summary.completed, tone: 'complete' },
            { label: 'En proceso', value: summary.progress, tone: 'progress' },
            { label: 'Incidencias', value: summary.issue, tone: 'issue' },
            { label: 'Pendientes', value: summary.pending, tone: 'pending' }
        ];
        const max = Math.max(1, ...data.map((item) => item.value));
        const rows = window.d3.select(target)
            .selectAll('.progress-status-row')
            .data(data)
            .enter()
            .append('div')
            .attr('class', (item) => `progress-status-row progress-status-row--${item.tone}`);

        rows.append('span')
            .attr('class', 'progress-status-row__label')
            .text((item) => item.label);

        rows.append('div')
            .attr('class', 'progress-status-row__track')
            .append('span')
            .style('width', '0%')
            .transition()
            .duration(650)
            .style('width', (item) => `${Math.max(4, (item.value / max) * 100)}%`);

        rows.append('strong').text((item) => item.value);
    }

    function renderProgressMetric(label, value, total, tone) {
        return `
            <div class="progress-metric progress-metric--${tone}">
                <span>${escapeHtml(label)}</span>
                <strong>${value}</strong>
                <small>de ${total}</small>
            </div>
        `;
    }

    function renderStageProgressCard(stage) {
        return `
            <article class="stage-progress-card">
                <div class="stage-progress-card__top">
                    <h4>${escapeHtml(stage.title)}</h4>
                    <strong>${stage.percent}%</strong>
                </div>
                <div class="stage-progress-card__bar" aria-hidden="true">
                    <span style="width: ${stage.percent}%"></span>
                </div>
                <p>${stage.completed}/${stage.total} concluidos · ${stage.pending} pendientes</p>
            </article>
        `;
    }

    function getProgressSummary(record) {
        const procedures = getAllProcedures();
        const total = procedures.length;
        let completed = 0;
        let progress = 0;
        let issue = 0;
        let pending = 0;
        const pendingItems = [];

        procedures.forEach((item) => {
            const status = readRecordColumn(record, item.statusColumn);
            const mode = getStatusMode(item, status);
            if (mode === STATUS_COMPLETE) {
                completed += 1;
            } else if (mode === STATUS_PROGRESS) {
                progress += 1;
            } else if (mode === STATUS_ISSUE) {
                issue += 1;
            } else {
                pending += 1;
                pendingItems.push(item.title);
            }
        });

        const percent = total ? Math.round((completed / total) * 100) : 0;
        const stages = getStageProgressSummary(record);
        return {
            total,
            completed,
            progress,
            issue,
            pending,
            percent,
            sourceRows: record.sourceRows || 1,
            lastUpdate: record.timestamp || record.reportDate || 'Sin fecha registrada',
            stages,
            pendingPreview: pendingItems.length ? pendingItems.slice(0, 3).join(', ') : 'Sin pendientes detectados',
            completeText: `${completed} completos`,
            progressText: `${progress} en proceso`,
            issueText: `${issue} con incidencia`,
            pendingText: `${pending} pendientes`
        };
    }

    function getStageProgressSummary(record) {
        return sections
            .filter((section) => section.type === 'procedures')
            .map((section) => {
                const total = section.procedures.length;
                let completed = 0;
                let pending = 0;
                section.procedures.forEach((item) => {
                    const status = readRecordColumn(record, item.statusColumn);
                    const mode = getStatusMode(item, status);
                    if (mode === STATUS_COMPLETE) {
                        completed += 1;
                    } else if (!mode) {
                        pending += 1;
                    }
                });

                return {
                    title: section.title,
                    total,
                    completed,
                    pending,
                    percent: total ? Math.round((completed / total) * 100) : 0
                };
            });
    }

    function getAllProcedures() {
        return sections.reduce((items, section) => {
            if (section.type === 'procedures') {
                return items.concat(section.procedures);
            }
            return items;
        }, []);
    }

    function showReportDeck() {
        if (!reportDeckPanel || !reportDeck || !state.latestProjectRecord) {
            return;
        }

        const summary = getProgressSummary(state.latestProjectRecord);
        reportDeck.innerHTML = renderReportDeck(summary, state.latestProjectRecord);
        reportDeckPanel.hidden = false;
        reportDeckPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function hideReportDeck() {
        if (reportDeckPanel) {
            reportDeckPanel.hidden = true;
        }
    }

    function renderReportDeck(summary, record) {
        const projectName = record.projectName || state.trackingProjectName || 'Proyecto';
        const stageSlides = getStageProgressSummary(record).map((stage) => renderReportStageSlide(stage, record)).join('');
        return `
            <section class="report-slide report-slide--cover">
                <img class="report-cover-bg" src="https://cdn.sassoapps.com/dgmesnie/portada_ppt.png" alt="">
                <div class="report-cover-overlay"></div>
                <div class="report-slide__top">
                    <img src="Estilos Institucionales/img/logo_gob.png" alt="Gobierno de México">
                    <span></span>
                    <img src="Estilos Institucionales/img/logo_sener.png" alt="Secretaría de Energía">
                    <div class="report-slide__unit">DGMESNIE · Subsecretaría de Planeación</div>
                </div>
                <div class="report-slide__body">
                    <p class="report-slide__eyebrow">Seguimiento de proyectos · ${escapeHtml(formatDateDisplay(new Date()))}</p>
                    <h1>${escapeHtml(projectName)}</h1>
                    <p>Subsecretaría de Planeación y Transición Energética</p>
                    <p class="report-slide__dg">Dirección General de Metodologías y Estadísticas del Sistema Nacional de Información Energética</p>
                    <div class="report-slide__meta">
                        <strong>${summary.percent}%</strong>
                        <span>Avance general al ${escapeHtml(formatDateDisplay(new Date()))}</span>
                    </div>
                </div>
                <div class="report-slide__band"></div>
            </section>
            <section class="report-slide report-slide--summary">
                ${renderReportHeader('Resumen ejecutivo', projectName)}
                <div class="report-narrative">
                    <strong>${escapeHtml(projectName)}</strong> registra un avance general de ${summary.percent}% con ${summary.completed} trámites concluidos, ${summary.progress} en proceso y ${summary.pending} pendientes por atender.
                </div>
                <div class="report-kpi-grid">
                    ${renderReportKpi('Avance general', `${summary.percent}%`, 'Concluido')}
                    ${renderReportKpi('Concluidos', summary.completed, `de ${summary.total}`)}
                    ${renderReportKpi('En proceso', summary.progress, 'trámites')}
                    ${renderReportKpi('Pendientes', summary.pending, 'por atender')}
                </div>
                <div class="report-summary-grid">
                    <div class="report-donut">${summary.percent}%</div>
                    <div class="report-stage-list">
                        ${summary.stages.map((stage) => `
                            <div class="report-stage-row">
                                <span>${escapeHtml(stage.title)}</span>
                                <div><i style="width:${stage.percent}%"></i></div>
                                <strong>${stage.percent}%</strong>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ${renderReportFooter('1')}
            </section>
            ${stageSlides}
        `;
    }

    function renderReportHeader(title, projectName) {
        return `
            <div class="report-slide__header">
                <div class="report-brand-left">Seguimiento de Proyectos</div>
                <div class="report-ef-title">${escapeHtml(title)}</div>
                <div class="report-logo-right">
                    <span>${escapeHtml(projectName)}</span>
                    <img src="Estilos Institucionales/img/logo_sener.png" alt="SENER">
                </div>
            </div>
        `;
    }

    function renderReportFooter(page) {
        return `
            <div class="report-slide__footer">
                <span>SENER · DGMESNIE</span>
                <span>${page}</span>
            </div>
        `;
    }

    function renderReportKpi(label, value, detail) {
        return `
            <article class="report-kpi">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
                <small>${escapeHtml(detail)}</small>
            </article>
        `;
    }

    function renderReportStageSlide(stage, record) {
        const projectName = record.projectName || state.trackingProjectName || 'Proyecto';
        const section = sections.find((candidate) => candidate.title === stage.title);
        const procedures = section ? section.procedures : [];
        return `
            <section class="report-slide report-slide--stage">
                ${renderReportHeader(stage.title, projectName)}
                <div class="report-narrative">
                    Esta etapa presenta ${stage.completed} de ${stage.total} trámites concluidos. Los campos pendientes se conservan para seguimiento y los cambios posteriores quedan trazados en el historial.
                </div>
                <div class="report-stage-summary">
                    ${renderReportKpi('Avance de etapa', `${stage.percent}%`, `${stage.completed}/${stage.total} concluidos`)}
                    ${renderReportKpi('Pendientes', stage.pending, 'sin concluir')}
                </div>
                <div class="report-procedure-table">
                    ${procedures.map((item) => renderReportProcedureRow(item, record)).join('')}
                </div>
                ${renderReportFooter(String(sections.filter((item) => item.type === 'procedures').indexOf(section) + 2))}
            </section>
        `;
    }

    function renderReportProcedureRow(item, record) {
        const status = readRecordColumn(record, item.statusColumn) || 'Pendiente';
        const mode = getStatusMode(item, status);
        const note = readRecordColumn(record, item.summaryColumn) || readRecordColumn(record, item.detailColumn) || 'Sin comentario registrado';
        return `
            <div class="report-procedure-row report-procedure-row--${mode || 'pending'}">
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(status)}</span>
                <p>${escapeHtml(note)}</p>
            </div>
        `;
    }

    async function downloadReportPdf() {
        if (!reportDeck || !reportDeckPanel) {
            return;
        }

        if (!state.latestProjectRecord) {
            return;
        }

        if (reportDeckPanel.hidden) {
            showReportDeck();
        }

        if (!window.html2canvas || !window.jspdf?.jsPDF) {
            window.print();
            return;
        }

        const originalLabel = downloadPdfButton ? downloadPdfButton.textContent : '';
        if (downloadPdfButton) {
            downloadPdfButton.disabled = true;
            downloadPdfButton.textContent = 'Generando...';
        }

        try {
            const pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'in', format: [13.333, 7.5] });
            const slides = Array.from(reportDeck.querySelectorAll('.report-slide'));
            const fileName = `${fileSafe(state.latestProjectRecord.projectName || state.trackingProjectName || 'seguimiento')}-seguimiento.pdf`;
            for (let index = 0; index < slides.length; index += 1) {
                if (index > 0) {
                    pdf.addPage([13.333, 7.5], 'landscape');
                }
                const canvas = await window.html2canvas(slides[index], {
                    scale: 1.35,
                    backgroundColor: '#ffffff',
                    useCORS: true
                });
                const image = canvas.toDataURL('image/jpeg', 0.88);
                pdf.addImage(image, 'JPEG', 0, 0, 13.333, 7.5, undefined, 'FAST');
            }
            const blob = pdf.output('blob');
            const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.rel = 'noopener';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } finally {
            if (downloadPdfButton) {
                downloadPdfButton.disabled = false;
                downloadPdfButton.textContent = originalLabel || 'Descargar PDF';
            }
        }
    }

    function findLatestProjectRecord(projectKey) {
        if (!projectKey) {
            return null;
        }

        const projectRecords = state.sheetRecords.filter((record) => normalize(record.projectName) === projectKey);
        if (!projectRecords.length) {
            return null;
        }

        const latestRecord = projectRecords[projectRecords.length - 1];
        const mergedValues = Array(TOTAL_COLUMNS).fill('');
        projectRecords.forEach((record) => {
            const rowValues = ensureRowLength(record.rowValues || []);
            rowValues.forEach((value, index) => {
                const cleanValue = String(value || '').trim();
                if (cleanValue) {
                    mergedValues[index] = cleanValue;
                }
            });
        });

        mergedValues[1] = latestRecord.reportDate || mergedValues[1] || formatDateInput(new Date());
        mergedValues[38] = latestRecord.projectName || mergedValues[38];

        return {
            projectName: latestRecord.projectName,
            timestamp: latestRecord.timestamp,
            reportDate: latestRecord.reportDate,
            rowValues: mergedValues,
            sourceRows: projectRecords.length
        };
    }

    function resetProcedureVisibility() {
        sectionsContainer.querySelectorAll('.procedure-card').forEach((card) => {
            card.classList.remove('procedure-card--complete', 'procedure-card--progress', 'procedure-card--issue', 'procedure-card--pending');
            delete card.dataset.progressStatus;
            setProcedureCardActive(card, true);
        });
    }

    function clearProcedureValues() {
        sections.forEach((section) => {
            if (section.type !== 'procedures') {
                return;
            }

            section.procedures.forEach((item) => {
                [`${item.id}Type`, `${item.id}Status`, `${item.id}CurrentSituation`, `${item.id}Detail`].forEach((fieldId) => {
                    const field = document.getElementById(fieldId);
                    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
                        field.value = '';
                        unlockStoredPrefillState(field);
                        clearFieldError(field);
                    }
                });
            });
        });
    }

    function setProcedureCardActive(card, active) {
        card.hidden = !active;
        card.querySelectorAll('input, select, textarea').forEach((field) => {
            field.disabled = !active;
            if (!active) {
                unlockStoredPrefillState(field);
                clearFieldError(field);
            }
        });
    }

    function setProcedureCardStatus(card, mode, hasStatus) {
        card.hidden = false;
        card.classList.remove('procedure-card--complete', 'procedure-card--progress', 'procedure-card--issue', 'procedure-card--pending');
        const statusClass = mode === STATUS_COMPLETE
            ? 'procedure-card--complete'
            : mode === STATUS_PROGRESS
                ? 'procedure-card--progress'
                : mode === STATUS_ISSUE
                    ? 'procedure-card--issue'
                    : 'procedure-card--pending';
        card.classList.add(statusClass);
        card.dataset.progressStatus = hasStatus ? mode || 'pending' : 'pending';
        const badge = card.querySelector('[data-procedure-status]');
        if (badge) {
            badge.textContent = getStatusLabel(mode, hasStatus);
            badge.className = `procedure-status-badge procedure-status-badge--${mode || 'pending'}`;
        }
    }

    function getStatusLabel(mode, hasStatus) {
        if (mode === STATUS_COMPLETE) {
            return 'Concluido';
        }
        if (mode === STATUS_PROGRESS) {
            return 'En proceso';
        }
        if (mode === STATUS_ISSUE) {
            return 'Incidencia';
        }
        return hasStatus ? 'Revisar' : 'Pendiente';
    }

    function unlockStoredPrefillState(field) {
        if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) {
            return;
        }

        if (field.dataset.prefilled === 'true') {
            field.required = field.dataset.wasRequired === 'true';
        }
        delete field.dataset.prefilled;
        delete field.dataset.wasRequired;
        delete field.dataset.originalMode;
        delete field.dataset.originalValue;
        const wrapper = field.closest('.field');
        if (wrapper) {
            wrapper.classList.remove('is-prefilled');
        }
        const editButton = wrapper ? wrapper.querySelector('[data-edit-field]') : null;
        if (editButton instanceof HTMLButtonElement) {
            editButton.hidden = true;
        }
    }

    function prefillProjectValues(record) {
        if (!record) {
            return;
        }
    }

    function prefillProcedure(item, record) {
        if (!record) {
            return;
        }

        if (item.typeColumn) {
            const typeField = document.getElementById(`${item.id}Type`);
            const typeValue = readRecordColumn(record, item.typeColumn);
            if (typeField && typeValue) {
                setFieldValue(typeField, typeValue);
            }
        }

        const statusField = document.getElementById(`${item.id}Status`);
        const statusValue = readRecordColumn(record, item.statusColumn);
        if (statusField && statusValue) {
            setFieldValue(statusField, statusValue);
            statusField.dataset.originalMode = getStatusMode(item, statusValue);
            statusField.dataset.originalValue = statusValue;
        }

        const currentSituationField = document.getElementById(`${item.id}CurrentSituation`);
        const currentSituationValue = readRecordColumn(record, item.summaryColumn);
        if (currentSituationField && currentSituationValue) {
            setFieldValue(currentSituationField, currentSituationValue);
        }

        const detailField = document.getElementById(`${item.id}Detail`);
        const detailValue = readRecordColumn(record, item.detailColumn);
        if (detailField && detailValue) {
            setFieldValue(detailField, detailValue);
        }
    }

    function setFieldValue(field, value) {
        const hasOption = !(field instanceof HTMLSelectElement) || Array.from(field.options).some((optionNode) => optionNode.value === value);
        if (hasOption) {
            field.value = value;
            lockPrefilledField(field);
        }
    }

    function lockPrefilledField(field) {
        if (!canEditPrefilledField(field.id) || !state.latestProjectRecord) {
            return;
        }

        field.dataset.prefilled = 'true';
        field.dataset.wasRequired = field.required ? 'true' : 'false';
        field.disabled = true;
        field.required = false;
        const wrapper = field.closest('.field');
        if (wrapper) {
            wrapper.classList.add('is-prefilled');
        }
        const editButton = wrapper ? wrapper.querySelector('[data-edit-field]') : null;
        if (editButton instanceof HTMLButtonElement) {
            editButton.hidden = false;
        }
    }

    function unlockPrefilledField(field) {
        field.disabled = false;
        field.required = field.dataset.wasRequired === 'true';
        delete field.dataset.prefilled;
        const wrapper = field.closest('.field');
        if (wrapper) {
            wrapper.classList.remove('is-prefilled');
        }
        const editButton = wrapper ? wrapper.querySelector('[data-edit-field]') : null;
        if (editButton instanceof HTMLButtonElement) {
            editButton.hidden = true;
        }
        field.focus();
    }

    function canEditPrefilledField(fieldKey) {
        return !['projectName', 'reportDate'].includes(fieldKey);
    }

    function warnIfCompleteStatusWasDowngraded(field) {
        if (!(field instanceof HTMLSelectElement) || field.dataset.originalMode !== STATUS_COMPLETE) {
            return;
        }

        const item = getAllProcedures().find((procedureItem) => `${procedureItem.id}Status` === field.id);
        const currentMode = item ? getStatusMode(item, field.value) : '';
        if (currentMode && currentMode !== STATUS_COMPLETE) {
            setGlobalMessage('Estás cambiando un trámite que estaba concluido. Se guardará como nueva versión del seguimiento y quedará la traza del cambio.', 'warning');
        }
    }

    function readRecordColumn(record, column) {
        if (!record || !Array.isArray(record.rowValues) || !column) {
            return '';
        }

        return String(record.rowValues[column - 1] || '').trim();
    }

    function getStatusMode(item, value) {
        const normalized = normalize(value);
        const match = (item.statusOptions || []).find((statusOption) => normalize(statusOption.value) === normalized);
        if (match) {
            return match.mode;
        }

        if (['aprobado', 'aprobada', 'liberado', 'entregado', 'firmado', 'realizada'].includes(normalized)) {
            return STATUS_COMPLETE;
        }

        if (['pendiente', 'en elaboracion', 'en proceso'].includes(normalized)) {
            return STATUS_PROGRESS;
        }

        if (['otro', 'otros', 'detenido'].includes(normalized)) {
            return STATUS_ISSUE;
        }

        return '';
    }

    function findNextVisibleStep(startIndex) {
        for (let index = Math.max(0, startIndex); index < sections.length; index += 1) {
            if (isSectionAvailable(index)) {
                return index;
            }
        }

        return 0;
    }

    function findPreviousVisibleStep(startIndex) {
        for (let index = Math.min(startIndex, sections.length - 1); index >= 0; index -= 1) {
            if (isSectionAvailable(index)) {
                return index;
            }
        }

        return 0;
    }

    function isSectionAvailable(index) {
        const section = sections[index];
        if (!section) {
            return false;
        }

        if (section.type === 'general') {
            return true;
        }

        return section.procedures.some((item) => {
            const card = sectionsContainer.querySelector(`[data-procedure-id="${item.id}"]`);
            return card && !card.hidden;
        });
    }

    function validateProjectField() {
        const projectField = document.getElementById('projectName');
        const normalized = normalize(projectField.value);

        if (!normalized) {
            clearFieldError(projectField);
            updateSubmitState();
            return false;
        }

        clearFieldError(projectField);
        updateSubmitState();
        return true;
    }

    function validateField(field) {
        if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) {
            return true;
        }

        if (field.disabled || isFieldInHiddenSection(field)) {
            clearFieldError(field);
            return true;
        }

        const value = field.value.trim();
        const wrapper = field.closest('.field');

        if (field.required && !value) {
            setFieldError(field, 'Este campo es obligatorio.');
            return false;
        }

        if (field instanceof HTMLTextAreaElement && field.required && field.minLength > 0 && value.length < field.minLength) {
            setFieldError(field, `Captura al menos ${field.minLength} caracteres.`);
            return false;
        }

        if (field instanceof HTMLInputElement && field.type === 'text' && field.minLength > 0 && value.length < field.minLength) {
            setFieldError(field, `Captura al menos ${field.minLength} caracteres.`);
            return false;
        }

        if (field.id === 'projectName') {
            return validateProjectField();
        }

        if (wrapper && wrapper.dataset.conditionalOn && field.required && value.length < 10) {
            setFieldError(field, 'Cuando este campo se habilita, se requiere una descripcion breve pero especifica.');
            return false;
        }

        clearFieldError(field);
        return true;
    }

    function setFieldError(field, message) {
        const wrapper = field.closest('.field');
        if (!wrapper) {
            return;
        }

        wrapper.classList.add('is-invalid');
        const errorNode = wrapper.querySelector('.field__error');
        if (errorNode) {
            errorNode.textContent = message;
        }
    }

    function clearFieldError(field) {
        const wrapper = field.closest('.field');
        if (!wrapper) {
            return;
        }

        wrapper.classList.remove('is-invalid');
        const errorNode = wrapper.querySelector('.field__error');
        if (errorNode) {
            errorNode.textContent = '';
        }
    }

    function validateForm() {
        const fields = Array.from(form.querySelectorAll('input, select, textarea'));
        let allValid = true;

        fields.forEach((field) => {
            if (!validateField(field)) {
                allValid = false;
            }
        });

        if (!validateProjectField()) {
            allValid = false;
        }

        updateSubmitState();
        return allValid;
    }

    function updateSubmitState() {
        const projectError = form.querySelector('[data-field-key="projectName"].is-invalid');
        submitButton.disabled = state.formLocked || state.isSubmitting || Boolean(projectError) || submitButton.hidden;
        if (nextStepButton) {
            nextStepButton.disabled = state.formLocked || state.isSubmitting;
        }
        if (prevStepButton) {
            prevStepButton.disabled = state.formLocked || state.isSubmitting || state.currentStep === 0;
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!state.trackingAccessValid) {
            setGlobalMessage('Liga de seguimiento no válida. No es posible guardar el registro.', 'error');
            return;
        }

        if (!validateForm()) {
            setGlobalMessage('Revisa los campos marcados antes de enviar el formulario.', 'error');
            const firstInvalid = form.querySelector('.is-invalid .field__control, .is-invalid .field__select, .is-invalid .field__textarea');
            if (firstInvalid instanceof HTMLElement) {
                firstInvalid.focus();
            }
            return;
        }

        if (!state.hasAppsScript) {
            setGlobalMessage('No fue posible guardar el registro. Intenta nuevamente mas tarde.', 'warning');
            return;
        }

        state.isSubmitting = true;
        updateNavigationState();
        submitButton.textContent = 'Enviando...';

        try {
            const payload = buildPayload();
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok || !data.ok) {
                throw new Error(data.message || 'No fue posible guardar el registro.');
            }

            state.projectNames.add(normalize(payload.projectName));
            state.sheetRecords.push({
                projectName: payload.projectName,
                timestamp: new Date().toLocaleString('es-MX'),
                reportDate: payload.reportDate || '',
                rowValues: payload.rowValues
            });
            state.existingRows += 1;
            form.reset();
            state.latestProjectRecord = null;
            initializeDates();
            restoreTrackingProjectField();
            renderProjectOptions();
            applyProjectContext();
            showStep(0);
            validateProjectField();
            setGlobalMessage('Registro enviado correctamente.', 'success');
        } catch (error) {
            setGlobalMessage(error.message, 'error');
        } finally {
            state.isSubmitting = false;
            submitButton.textContent = 'Enviar formulario';
            updateNavigationState();
        }
    }

    function buildPayload() {
        const values = state.latestProjectRecord && Array.isArray(state.latestProjectRecord.rowValues)
            ? ensureRowLength(state.latestProjectRecord.rowValues)
            : Array(TOTAL_COLUMNS).fill('');
        const fields = Array.from(form.querySelectorAll('input, select, textarea'));

        fields.forEach((field) => {
            const column = Number(field.dataset.column);
            if (!column || isFieldInHiddenConditionalBlock(field)) {
                return;
            }
            values[column - 1] = field.value.trim();
        });

        lockReportDateField();
        enforceTrackingProjectName();
        const projectName = (state.trackingProjectName || document.getElementById('projectName').value).trim();
        const reportDate = document.getElementById('reportDate').value;
        values[1] = reportDate;
        values[38] = projectName;
        return {
            submittedAt: new Date().toISOString(),
            submittedAtDisplay: formatDateTime(new Date()),
            projectName,
            reportDate,
            trackingKey: state.trackingKey,
            rowValues: values
        };
    }

    function looksLikeDate(value) {
        return /^\d{1,2}\/\d{1,2}\/\d{4}(?:\s+\d{1,2}:\d{2}:\d{2})?$/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value);
    }

    function parseDate(value) {
        if (!value) {
            return null;
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const parts = value.split('-').map(Number);
            return new Date(parts[0], parts[1] - 1, parts[2]);
        }

        const match = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (match) {
            return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
        }

        return null;
    }

    function formatDateInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatDateTime(date) {
        return new Intl.DateTimeFormat('es-MX', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(date);
    }

    function formatDateDisplay(date) {
        return date.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    function focusFirstInvalid() {
        const firstInvalid = form.querySelector('.is-invalid .field__control, .is-invalid .field__select, .is-invalid .field__textarea');
        if (firstInvalid instanceof HTMLElement) {
            firstInvalid.focus();
        }
    }

    function isFieldInHiddenSection(field) {
        const section = field.closest('.form-section');
        const card = field.closest('.procedure-card');
        return Boolean((section && section.hidden) || (card && card.hidden));
    }

    function isFieldInHiddenConditionalBlock(field) {
        const wrapper = field.closest('.field');
        return Boolean(wrapper && wrapper.hidden && wrapper.dataset.conditionalOn);
    }

    function normalize(value) {
        return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
    }

    function fileSafe(value) {
        return String(value || 'reporte')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 80) || 'reporte';
    }

    function resetConditionalDetails() {
        sections.forEach((section) => {
            if (section.type !== 'procedures') {
                return;
            }
            section.procedures.forEach((item) => toggleConditionalFields(`${item.id}Status`));
        });
    }

    function setGlobalMessage(message, tone) {
        if (tone === 'info') {
            globalMessage.hidden = true;
            globalMessage.textContent = '';
            return;
        }

        const toneClass = `notice-banner--${tone}`;
        globalMessage.hidden = false;
        globalMessage.className = `notice-banner ${toneClass}`;
        globalMessage.textContent = message;
    }

    function escapeHtml(value) {
        return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/`/g, '&#96;');
    }
})();
