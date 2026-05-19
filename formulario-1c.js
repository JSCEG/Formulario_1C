(function () {
    const SHEET_READ_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRPZHXFcFuVRHH2gV5lyTSR3BKyZ3C1KyWVDLs5U_NBnvmqecRKa1-BVXNxCy4UkTQaH1HamMW_c7Q_/pub?gid=1770165044&single=true&output=tsv';
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwO8XoBc69NHZWPviaSOq15PFyERfhb3jHQGzM8SdV3LkGMUd_AptlTVLv-E4gqCnpTKg/exec';
    const LOCAL_DUPLICATE_KEY = 'formulario1c.submissions';
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

    const technologyOptions = [
        '',
        'Solar',
        'Eolica',
        'Hidroelectrica',
        'Geotermica',
        'Ciclo combinado',
        'Almacenamiento',
        'Hibrido',
        'Otro'
    ];

    const sections = [
        {
            id: 'general',
            title: 'Datos generales',
            description: 'Informacion principal que se usa para validacion, control de duplicados y clasificacion del proyecto.',
            type: 'general',
            fields: [
                { key: 'reportDate', label: 'Fecha de reporte', control: 'input', inputType: 'date', required: true, column: 2, hint: 'Se guardara en la columna Fecha de la hoja de concentrado.' },
                { key: 'projectName', label: 'Nombre del proyecto', control: 'input', inputType: 'text', required: true, minLength: 5, column: 39, hint: 'Se usa como llave principal para evitar registros duplicados.' },
                { key: 'technology', label: 'Tecnologia principal del proyecto', control: 'select', required: true, options: technologyOptions, column: 57, hint: 'Campo auxiliar para clasificar el proyecto en la hoja.' },
                { key: 'generalNotes', label: 'Observaciones generales', control: 'textarea', required: false, minLength: 0, column: 58, full: true, hint: 'Usa este espacio para contexto que no quepa en un tramite especifico.' }
            ]
        },
        {
            id: 'core-permits',
            title: 'Tramites estrategicos',
            description: 'Tramites base vinculados a garantias, interconexion, MISSE y componente ambiental.',
            type: 'procedures',
            procedures: [
                procedure('guarantees', 'Pago de garantias', 3, 4, 40, { statusOptions: statusOptionSets.guarantees, statusLabel: 'Cual es el estatus del pago de garantias?' }),
                procedure('interconnection', 'Contrato de interconexion', 5, 6, 41, { statusOptions: statusOptionSets.interconnection, statusLabel: 'Estatus de la firma del contrato de interconexion' }),
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
                procedure('inah', 'Tramites ante INAH', 17, 18, 46),
                procedure('conagua', 'Tramites ante CONAGUA', 19, 20, 47),
                procedure('conafor', 'Tramites ante CONAFOR', 21, 22, 48),
                procedure('sedatu', 'Tramites ante SEDATU', 23, 24, 49),
                procedure('land-possession', 'Posesion de terrenos', 25, 26, 50),
                procedure('construction-license', 'Licencia de construccion', 27, 28, 51)
            ]
        },
        {
            id: 'closure',
            title: 'Infraestructura y cierre operativo',
            description: 'Ultima seccion para tramites municipales, servidumbres, derecho de via, obras de refuerzo y procura.',
            type: 'procedures',
            procedures: [
                procedure('municipality', 'Tramites municipales', 29, 30, 52, { statusOptions: statusOptionSets.municipality }),
                procedure('easement', 'Servidumbre de paso', 31, 32, 53, { statusOptions: statusOptionSets.easement }),
                procedure('right-of-way', 'Derecho de via', 33, 34, 54),
                procedure('reinforcement-works', 'Obras de refuerzo', 35, 36, 55),
                procedure('procurement', 'Avances en procura', 37, 38, 56)
            ]
        }
    ];

    const state = {
        duplicateKeys: new Set(),
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
        loadDuplicateKeys();
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
                <h4 class="procedure-card__title">${escapeHtml(item.title)}</h4>
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

        return `
            <div class="${className.join(' ')}" data-field-key="${field.key}" ${field.conditionalOn ? `data-conditional-on="${field.conditionalOn}"` : ''} ${field.conditionalMode ? `data-conditional-mode="${field.conditionalMode}"` : ''}>
                <label class="field__label" for="${field.key}">
                    <span>${escapeHtml(field.label)}</span>
                    ${field.required ? '<span class="field__required">*</span>' : ''}
                </label>
                ${renderControl(field)}
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
        form.addEventListener('submit', handleSubmit);
        prevStepButton.addEventListener('click', goToPreviousStep);
        nextStepButton.addEventListener('click', goToNextStep);
    }

    function configureTrackingLink() {
        const params = new URLSearchParams(window.location.search);
        state.trackingProjectName = (params.get(PROJECT_URL_PARAM) || '').trim();
        state.trackingKey = (params.get(TRACKING_KEY_URL_PARAM) || '').trim();

        const projectField = document.getElementById('projectName');
        if (state.trackingProjectName && projectField instanceof HTMLInputElement) {
            projectField.value = state.trackingProjectName;
            projectField.readOnly = true;
            projectField.removeAttribute('list');
        }

        if (!state.trackingProjectName || !state.trackingKey) {
            state.trackingAccessValid = false;
            setFormLocked(true);
            setGlobalMessage('Liga de seguimiento no valida. Abre el formulario desde la liga enviada para tu proyecto.', 'error');
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
            validateDuplicateField();
        } catch (error) {
            state.trackingAccessValid = false;
            setFormLocked(true);
            setGlobalMessage(error.message || 'La liga de seguimiento no es valida.', 'error');
        }
    }

    function restoreTrackingProjectField() {
        const projectField = document.getElementById('projectName');
        if (state.trackingProjectName && projectField instanceof HTMLInputElement) {
            projectField.value = state.trackingProjectName;
            projectField.readOnly = true;
            projectField.removeAttribute('list');
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

    async function loadDuplicateKeys() {
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
                const duplicateKey = buildReportKey(record.projectName, record.reportDate);
                if (projectKey) {
                    state.projectNames.add(projectKey);
                }
                if (duplicateKey) {
                    state.duplicateKeys.add(duplicateKey);
                }
            });

            const localKeys = readLocalDuplicateKeys();
            localKeys.forEach((key) => state.duplicateKeys.add(key));

            state.loadingSheet = false;
            renderProjectOptions();
            applyProjectContext();
            validateDuplicateField();
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
                applyProjectContext();
            }
            validateDuplicateField();
        }

        if (field.id.endsWith('Status')) {
            toggleConditionalFields(field.id);
        }

        validateField(field);
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
            field.required = isActive;
            field.disabled = !isActive;
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

                const isComplete = mode === STATUS_COMPLETE;
                setProcedureCardActive(card, !isComplete);
                if (!isComplete) {
                    prefillProcedure(item, state.latestProjectRecord);
                }
            });
        });

        resetConditionalDetails();
        renderStepper();
        showStep(findNextVisibleStep(0));
    }

    function findLatestProjectRecord(projectKey) {
        if (!projectKey) {
            return null;
        }

        for (let index = state.sheetRecords.length - 1; index >= 0; index -= 1) {
            const record = state.sheetRecords[index];
            if (normalize(record.projectName) === projectKey) {
                return record;
            }
        }

        return null;
    }

    function resetProcedureVisibility() {
        sectionsContainer.querySelectorAll('.procedure-card').forEach((card) => {
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
                clearFieldError(field);
            }
        });
    }

    function prefillProjectValues(record) {
        const technologyField = document.getElementById('technology');
        if (!record || !(technologyField instanceof HTMLSelectElement)) {
            return;
        }

        const technology = readRecordColumn(record, 57);
        if (technology && !technologyField.value) {
            setFieldValue(technologyField, technology);
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
        }
    }

    function setFieldValue(field, value) {
        const hasOption = !(field instanceof HTMLSelectElement) || Array.from(field.options).some((optionNode) => optionNode.value === value);
        if (hasOption) {
            field.value = value;
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
        return match ? match.mode : '';
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

    function validateDuplicateField() {
        const projectField = document.getElementById('projectName');
        const reportDateField = document.getElementById('reportDate');
        const normalized = normalize(projectField.value);
        const duplicateFound = normalized && state.duplicateKeys.has(buildReportKey(projectField.value, reportDateField.value));

        if (!normalized) {
            clearFieldError(projectField);
            updateSubmitState();
            return false;
        }

        if (duplicateFound) {
            setFieldError(projectField, 'Ya existe un avance para este proyecto en la semana seleccionada. Cambia la fecha de reporte o verifica la hoja.');
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
            return validateDuplicateField();
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

        if (!validateDuplicateField()) {
            allValid = false;
        }

        updateSubmitState();
        return allValid;
    }

    function updateSubmitState() {
        const duplicateError = form.querySelector('[data-field-key="projectName"].is-invalid');
        submitButton.disabled = state.formLocked || state.isSubmitting || Boolean(duplicateError) || submitButton.hidden;
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
            setGlobalMessage('Liga de seguimiento no valida. No es posible guardar el registro.', 'error');
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

            const duplicateKey = buildReportKey(payload.projectName, payload.reportDate);
            storeLocalDuplicateKey(duplicateKey);
            state.duplicateKeys.add(duplicateKey);
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
            resetProcedureVisibility();
            initializeDates();
            restoreTrackingProjectField();
            resetConditionalDetails();
            renderProjectOptions();
            showStep(0);
            validateDuplicateField();
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
            if (!column || field.disabled || isFieldInHiddenSection(field)) {
                return;
            }
            values[column - 1] = field.value.trim();
        });

        const projectName = document.getElementById('projectName').value.trim();
        const reportDate = document.getElementById('reportDate').value;
        return {
            submittedAt: new Date().toISOString(),
            submittedAtDisplay: formatDateTime(new Date()),
            projectName,
            reportDate,
            trackingKey: state.trackingKey,
            duplicateKey: buildReportKey(projectName, reportDate),
            rowValues: values
        };
    }

    function looksLikeDate(value) {
        return /^\d{1,2}\/\d{1,2}\/\d{4}(?:\s+\d{1,2}:\d{2}:\d{2})?$/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value);
    }

    function buildReportKey(projectName, reportDate) {
        const projectKey = normalize(projectName);
        if (!projectKey) {
            return '';
        }

        return `${projectKey}|${getWeekKey(reportDate || formatDateInput(new Date()))}`;
    }

    function getWeekKey(value) {
        const date = parseDate(value) || new Date();
        const weekDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const day = weekDate.getUTCDay() || 7;
        weekDate.setUTCDate(weekDate.getUTCDate() + 4 - day);
        const yearStart = new Date(Date.UTC(weekDate.getUTCFullYear(), 0, 1));
        const week = Math.ceil((((weekDate - yearStart) / 86400000) + 1) / 7);
        return `${weekDate.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
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

    function normalize(value) {
        return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
    }

    function resetConditionalDetails() {
        sections.forEach((section) => {
            if (section.type !== 'procedures') {
                return;
            }
            section.procedures.forEach((item) => toggleConditionalFields(`${item.id}Status`));
        });
    }

    function readLocalDuplicateKeys() {
        try {
            const stored = window.localStorage.getItem(LOCAL_DUPLICATE_KEY);
            const parsed = JSON.parse(stored || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function storeLocalDuplicateKey(key) {
        if (!key) {
            return;
        }

        const keys = readLocalDuplicateKeys();
        if (!keys.includes(key)) {
            keys.push(key);
            window.localStorage.setItem(LOCAL_DUPLICATE_KEY, JSON.stringify(keys.slice(-100)));
        }
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
