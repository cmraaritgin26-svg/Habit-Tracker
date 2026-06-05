/*
 * TaskLens AI main client script.
 *
 * Editing map:
 * 1. Constants and safety/dictation patterns
 * 2. Mutable app state and DOM references
 * 3. Event wiring
 * 4. Feature renderers and dialogs
 * 5. Persistence, settings, security, import/export
 * 6. Notifications, AI, dictation parsing, and utility helpers
 *
 * Keep iphone/app.js mirrored when changing shared web behavior, then sync
 * root assets into www/ and android/app/src/main/assets/public before building.
 */

const storeKey = "habit-tracker:v1";
const taskBreakdownsStoreKey = "tasklens-ai:task-breakdowns:v1";
const legacyTaskBreakdownsStoreKey = `${["status", "task", "tracker"].join("-")}:task-breakdowns:v1`;
const aiTrainingExamplesStoreKey = "tasklens-ai:ai-training-examples:v1";
const photoAiUsageStoreKey = "tasklens-ai:photo-ai-usage:v1";
const photoAiTelemetryStoreKey = "tasklens-ai:photo-ai-telemetry:v1";
const archiveAStoreKey = "tasklens-ai:archive-a:v1";
const archiveBtoreKey = "tasklens-ai:archive-b:v1";
const focusStateStoreKey = "tasklens-ai:focusStates:v1";
const focusLogStoreKey = "tasklens-ai:focusLog:v1";
const deletedfocusLogEntriesStoreKey = "tasklens-ai:focusLog-deleted:v1";
const dictationDocumentStoreKey = "tasklens-ai:dictation-documents:v1";
const settingsStoreKey = "tasklens-ai:settings:v1";
const firebaseAuthStoreKey = "tasklens-ai:firebase-auth:v1";
const onboardingCompleteStoreKey = "tasklens-ai:onboarding-complete:v2";
const aiDefaultEnabledStoreKey = "tasklens-ai:ai-default-enabled:v1";
const backupReminderStoreKey = "tasklens-ai:last-backup-reminder:v1";
const affirmationShownStoreKey = "tasklens-ai:last-affirmation:v1";
const affirmationlowFocusShownStoreKey = "tasklens-ai:last-lowFocus-affirmation:v1";
const DEFAULT_AI_BACKEND_URL = "https://habit-tracker-1-lp0z.onrender.com";
const DICTATION_FEATURE_ENABLED = false;
const AI_DICTATION_TIMEOUT_MS = 12000;
const AI_COACH_TIMEOUT_MS = 2500;
const AI_TASK_BREAKDOWN_TIMEOUT_MS = 45000;
const AI_TARGET_IMAGE_TIMEOUT_MS = 120000;
const AI_SAFETY_SCAN_TIMEOUT_MS = 6000;
const FREE_PHOTO_AI_LIMIT = 5;
const PREMIUM_PHOTO_AI_LIMIT = 35;
const PREMIUM_AFTER_IMAGE_LIMIT = 35;
const PREMIUM_MONTHLY_PRICE = "$5.99/month";
const PREMIUM_YEARLY_PRICE = "$59.99/year";
const HISTORY_RETENTION_DAYS = 3650;
const deadlineAlertStoreKey = "tasklens-ai:deadline-alerts:v1";
const deadlineEventStoreKey = "tasklens-ai:deadline-events:v1";
const focusAreaTrendAlertStoreKey = "tasklens-ai:focusArea-trend-alerts:v1";
const hasCompletedOnboarding = localStorage.getItem(onboardingCompleteStoreKey) === "true";
const dailyAffirmations = [
  "My brain does better with one clear next step than a perfect full plan.",
  "Starting small is not lowering the bar; it is building a ramp.",
  "I can use structure as support, not as proof that I should be different.",
  "A reset is part of the system, not a failure of the system.",
  "I do not need to feel ready before I take the next tiny action.",
  "My attention is easier to guide when the task is visible, specific, and close.",
  "I can make the room, the list, or the timer do some of the remembering for me.",
  "Done is allowed to be smaller than imagined.",
  "I can pause, name the friction, and lower the first step.",
  "Momentum often arrives after I begin, not before.",
  "I can protect my energy by choosing fewer tasks and finishing one.",
  "When everything feels urgent, I can pick what is next instead of what is loudest.",
  "My brain responds to cues, so I can set up cues with kindness.",
  "I can come back to the list without shame.",
  "A five-minute start can change the shape of the whole day.",
  "I am allowed to need reminders, visuals, timers, and breaks.",
  "Clarity beats pressure.",
  "The task is not my character; it is just the next thing to shape.",
  "I can make progress even when focus is uneven.",
  "A good system catches me when motivation drops.",
  "I can separate the mess from my worth.",
  "One checked step counts because it reduces future friction.",
  "I can choose a body double, a timer, or a photo when words feel too hard.",
  "Rest helps my focus; it is not stealing from progress.",
  "I can design my day around how my brain actually works.",
  "The next step can be embarrassingly small and still be the right step.",
  "I can use curiosity instead of criticism to restart.",
  "My attention needs direction, not punishment.",
  "I can turn overwhelm into a visible checklist.",
  "I am building tools for my real brain, not an imaginary one.",
  "Today, one specific step is enough to begin."
];
const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const urgentfocusStatePatterns = [
  /\b(kill myself|kill my self|kill me|end my life|take my life|take myself out|off myself|delete myself|unalive myself|unalive me|urgent-risk|urgent-risk)\b/i,
  /\b(i want to die|want to die|wanna die|wanting to die|wish i was dead|wish i were dead|rather be dead|better off dead|should be dead)\b/i,
  /\b(hurt myself|hurt my self|harm myself|harm my self|urgent-risk|urgent-risk|cut myself|cut my self|overdose|od on|take all my pills)\b/i,
  /\b(no reason to live|nothing to live for|can't go on|cannot go on|can't keep going|cannot keep going|done living|tired of living)\b/i,
  /\b(planning to die|plan to die|goodbye forever|this is goodbye|last note|final note|won't be here tomorrow|not going to be here tomorrow)\b/i,
  /\b(drive off (a )?(bridge|cliff|road)|jump off (a )?(bridge|building)|hang myself|shoot myself|stab myself|drown myself)\b/i
];
const lowFocusfocusStatePatterns = [
  /\b(low|lowFocus|hopeless|worthless|empty|numb|trapped|burden|unbearable|pointless|meaningless)\b/i,
  /\b(no energy|can't get out of bed|cannot get out of bed|nothing matters|lost interest|don't care anymore|cant care anymore)\b/i,
  /\b(alone|isolated|withdrawn|ashamed|guilt|crying|despair)\b/i
];
const negativeThoughtPatterns = [
  /\b(always|never|everything|nothing|everyone|no one)\b.*\b(fails?|wrong|bad|hates?|hopeless|ruined)\b/i,
  /\b(i am|i'm)\s+(a failure|worthless|useless|broken|a burden|not enough)\b/i,
  /\b(what if|worst case|can't handle|cannot handle|going to fall apart|spiral)\b/i,
  /\b(my fault|blame myself|should have|i ruin|i ruined|i mess everything up)\b/i
];
const focusLogStressPatterns = [
  /\b(stress|stressed|overwhelmed|over loaded|overloaded|panic|panicky|anxious|anxiety|pressure|can't cope|cannot cope|too much|burned out|burnt out|falling apart)\b/i
];
const focusLogConcernPatterns = [
  /\b(hate myself|i hate me|feel like a failure|i'?m failing|not worth it|can't do this|cannot do this|done with this|giving up|gave up|shutting down|spiraling|dark thoughts)\b/i,
  /\b(i'?m tired of|tired of everything|nothing is working|everything is too much|i feel broken|i feel useless|i feel worthless)\b/i,
  /\b(no one would miss me|everyone would be better without me|better without me|i am a burden|i'm a burden|burden to everyone)\b/i,
  /\b(i disappear|just disappear|wish i could disappear|don't want to exist|do not want to exist|stop existing)\b/i
];
const dictationNormalizationRules = [
  [/\bb\s*p\b|\bbp\b|\bpressure\b|\bpressure reading\b/g, "pressure"],
  [/\breading suger\b|\breading sug(?:er|ar)\b|\bsuger\b|\bsugar lvl\b|\bsugar level\b|\bbs\b|\bbg\b/g, "valueD"],
  [/\bgluco(?:s|se|ze)\b|\bglucous\b|\bglukose\b|\bglocos\b|\bfinger stick\b/g, "valueD"],
  [/\bcal(?:s|z)?\b|\bcals\b|\bkcal\b|\bvalueA(?:s|z)?\b|\bcalery\b|\bcaleries\b|\bcallories\b|\bvalorie(?:s|z)?\b|\bvaleries\b|\bvallories\b|\bfood energy\b/g, "valueA"],
  [/\bvalueB(?:s|z)?\b|\bvalueBo(?:s|z)?\b|\bvalueBo hydrate(?:s|z)?\b|\bvalueBohydrates?\b|\bnet valueB(?:s|z)?\b|\bmacro valueB(?:s|z)?\b/g, "valueB"],
  [/\bweigh(?:t|ed)?\b|\bweigh in\b|\bweighed in\b|\bscale\b|\bbody value\b|\bwait\b|\bwaight\b|\bwate\b|\blbs?\b|\bpound(?:s|z)?\b/g, "valueC"],
  [/\boz\b|\bozs\b|\bounce(?:s|z)?\b|\bounzes\b|\bfluid ounce(?:s|z)?\b/g, "ounces"],
  [/\bh20\b|\bh2o\b|\bhydrat(?:e|ion)\b|\bwat(?:er|r)\b|\bdrank\b|\bdrink\b|\bdrinks\b|\bwater\b/g, "water"],
  [/\bkeytone(?:s)?\b|\bketone(?:s)?\b|\bketo(?:sis)?\b|\bkeeto\b|\bfat burning\b/g, "phase"],
  [/\btop number\b|\bupper number\b|\bsis(?:tolic|toll?ic)?\b/g, "systolic"],
  [/\bbottom number\b|\blower number\b|\bdia(?:stolic|stall?ic)?\b/g, "diastolic"],
  [/\bhead ache\b|\bhedache\b|\bheadake\b|\bmigrane\b/g, "headache"],
  [/\bnause(?:a|ous)\b|\bnauzea\b|\bnausia\b|\bneausea\b/g, "nausea"],
  [/\bdizzy\b|\bdizzyness\b|\bdiz(?:i|y)ness\b/g, "dizziness"],
  [/\bfatique\b|\bfatige\b|\btierd\b|\btired af\b|\bwiped\b|\bexhausted\b/g, "fatigue"],
  [/\bsore thr(?:o|oa)t\b|\bthrought hurts\b|\bthroat hurt(?:s)?\b/g, "sore throat"],
  [/\bstomache ache\b|\bstomachake\b|\btummy ache\b|\bbelly ache\b/g, "stomach ache"],
  [/\bshort of breath\b|\bsob\b|\bcant breathe\b|\bcan't breathe\b/g, "shortness of breath"],
  [/\banx(?:y|ie|ious)?\b|\banxiet(?:y|ie)\b|\bfreaked out\b|\bpanicky\b/g, "anxious"],
  [/\bstressd\b|\bstrest\b|\bstressed out\b|\boverwhelmed\b|\bfrazzled\b/g, "stressed"],
  [/\bmeh\b|\bblah\b|\bmid\b|\bso so\b|\bjust ok\b|\bokayish\b/g, "okay"],
  [/\bdown bad\b|\bbum(?:m)?ed\b|\bsad af\b|\blow focusState\b|\bdeprest\b|\blow\b/g, "low"],
  [/\bgr8\b|\bgud\b|\bdoing good\b|\bfeelin good\b/g, "good"],
  [/\bfocusLog(?:ing)?\b|\bjournel\b|\bjurnal\b|\bnote 2 self\b|\bnote to-self\b/g, "focusLog"],
  [/\bto[- ]?do\b|\btodo\b|\btudu\b|\bt2do\b|\bremind me 2\b|\bneed 2\b|\bhave 2\b/g, "task"]
];
const today = toDateKey(new Date());
const wholeNumberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});
let filter = "all";
let habits = loadHabits();
let taskBreakdowns = loadTaskBreakdowns();
let aiTrainingExamples = loadAiTrainingExamples();
let archiveAEntries = loadarchiveAEntries();
let archiveBEntries = loadarchiveBEntries();
let focusStateEntries = loadfocusStateEntries();
let focusLogEntries = loadfocusLogEntries();
let dictationDocuments = loadDictationDocuments();
let appSettings = loadAppSettings();
let taskLensAuthSession = loadTaskLensAuthSession();
let pendingAccountAction = "";
let taskDeadlineEvents = loadTaskDeadlineEvents();
let editingHabitId = null;
let lastReminderKey = "";
let deadlineAlertKeys = loadDeadlineAlertKeys();
let appUnlocked = false;
let hiddenAt = 0;
let onboardingStepIndex = 0;
let dictationActive = false;
let activeWebRecognition = null;
let webDictationBuffer = "";
let webDictationPartial = "";
let webDictationCommitTimer = null;
let webDictationStopping = false;
let nativeDictationStopRequested = false;
let nativeDictationStopTimer = null;
let pendingDictationExtraction = null;
let pendingDictationTranscript = "";
let pendingParsedDictationResult = null;
let pendingParsedDictationDocument = null;
let dictationReviewStepIndex = 0;
let biometricPromptAttempted = false;
let confirmPasswordResolver = null;
let aiCoachCacheKey = "";
let aiCoachInsight = null;
let aiCoachRequestId = 0;
let aiCoachFailedKey = "";
let aiSafetyScanRequestId = 0;
let masterChartRangeDays = HISTORY_RETENTION_DAYS;
let smartCoachRenderTimer = null;
let activeOnboardingDictationButton = null;
let activeOnboardingFieldName = "";

function updateDialogScrollLock() {
  const hasOpenDialog = Boolean(document.querySelector(".history-modal:not([hidden]), .affirmation-modal:not([hidden])"));
  document.body.classList.toggle("dialog-open", hasOpenDialog);
}

if ("MutationObserver" in window) {
  const dialogScrollLockObserver = new MutationObserver(updateDialogScrollLock);
  dialogScrollLockObserver.observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: ["hidden"]
  });
}

updateDialogScrollLock();

const habitForm = document.querySelector("#habitForm");
const habitName = document.querySelector("#habitName");
const taskDate = document.querySelector("#taskDate");
const habitCategory = document.querySelector("#habitCategory");
const habitDeadline = document.querySelector("#habitDeadline");
const habitPriority = document.querySelector("#habitPriority");
const habitSize = document.querySelector("#habitSize");
const habitColor = document.querySelector("#habitColor");
const habitNote = document.querySelector("#habitNote");
const taskChoiceButtons = document.querySelectorAll("[data-task-choice-target]");
const archiveAForm = document.querySelector("#archiveAForm");
const archiveADate = document.querySelector("#archiveADate");
const valueA = document.querySelector("#valueA");
const valueB = document.querySelector("#valueB");
const valueC = document.querySelector("#valueC");
const valueCUnitLabel = document.querySelector("#valueCUnitLabel");
const convertvalueC = document.querySelector("#convertvalueC");
const phasePhase = document.querySelector("#phasePhase");
const valueD = document.querySelector("#valueD");
const systolic = document.querySelector("#systolic");
const diastolic = document.querySelector("#diastolic");
const importreading = document.querySelector("#importreading");
const water = document.querySelector("#water");
const waterControl = document.querySelector(".water-control");
const waterGlasses = document.querySelector("#waterGlasses");
const waterCount = document.querySelector("#waterCount");
const waterToggle = document.querySelector("#waterToggle");
const waterClear = document.querySelector("#waterClear");
const WATER_GLASS_OZ = 8;
const WATER_GLASS_COUNT = 10;
const DEFAULT_WATER_GOAL_OZ = 80;
const MIN_WATER_GOAL_OZ = 64;
const MAX_WATER_GOAL_OZ = WATER_GLASS_OZ * WATER_GLASS_COUNT;
let waterExpanded = false;
let valueCUnit = "lb";
let historyZoomDays = HISTORY_RETENTION_DAYS;
let historyFocusDateKey = today;
const avgvalueA = document.querySelector("#avgvalueA");
const avgvalueB = document.querySelector("#avgvalueB");
const latestvalueC = document.querySelector("#latestvalueC");
const latestphase = document.querySelector("#latestphase");
const latestvalueD = document.querySelector("#latestvalueD");
const latestreading = document.querySelector("#latestreading");
const latestWater = document.querySelector("#latestWater");
const archiveARows = document.querySelector("#archiveARows");
const archiveAEmpty = document.querySelector("#archiveAEmpty");
const historyButton = document.querySelector("#historyButton");
const archiveCHistoryDropdown = document.querySelector("#archiveCHistoryDropdown");
const archiveCHistoryMount = document.querySelector("#archiveCHistoryMount");
const historyModal = document.querySelector("#historyModal");
const historyClose = document.querySelector("#historyClose");
const historyRows = document.querySelector("#historyRows");
const historyEmpty = document.querySelector("#historyEmpty");
const masterChartButton = document.querySelector("#masterChartButton");
const masterChartModal = document.querySelector("#masterChartModal");
const masterChartClose = document.querySelector("#masterChartClose");
const masterChartRows = document.querySelector("#masterChartRows");
const masterChartEmpty = document.querySelector("#masterChartEmpty");
const masterChartRangeButtons = document.querySelectorAll("[data-master-chart-days]");
const historyChartEmpty = document.querySelector("#historyChartEmpty");
const historyMetricFilter = document.querySelector("#historyMetricFilter");
const historyFocusDate = document.querySelector("#historyFocusDate");
const historyZoomRange = document.querySelector("#historyZoomRange");
const historyZoomLabel = document.querySelector("#historyZoomLabel");
const historyRangeButtons = document.querySelectorAll("[data-history-days]");
const historyLegendButtons = document.querySelectorAll("[data-history-metric]");
const historyGrid = document.querySelector("#historyGrid");
const historyvalueCLine = document.querySelector(".history-valueC-line");
const historyvalueALine = document.querySelector(".history-valueA-line");
const historyvalueBLine = document.querySelector(".history-valueB-line");
const historyvalueDLine = document.querySelector(".history-valueD-line");
const historyPressureLine = document.querySelector(".history-pressure-line");
const historyWaterLine = document.querySelector(".history-water-line");
const habitList = document.querySelector("#habitList");
const habitTemplate = document.querySelector("#habitTemplate");
const emptyState = document.querySelector("#emptyState");
const photoAiHeroButton = document.querySelector("#photoAiHeroButton");
const brainDumpHeroButton = document.querySelector("#brainDumpHeroButton");
const winsPanel = document.querySelector("#winsPanel");
const winsSummary = document.querySelector("#winsSummary");
const winsList = document.querySelector("#winsList");
const todayLabel = document.querySelector("#todayLabel");
const weeklyTaskPercentBar = document.querySelector("#weeklyTaskPercentBar");
const weeklyTaskPercentFill = document.querySelector("#weeklyTaskPercentFill");
const weeklyTaskPercentMeta = document.querySelector("#weeklyTaskPercentMeta");
const graphAverage = document.querySelector("#graphAverage");
const affirmationModal = document.querySelector("#affirmationModal");
const affirmationText = document.querySelector("#affirmationText");
const dictationReviewModal = document.querySelector("#dictationReviewModal");
const dictationReviewClose = document.querySelector("#dictationReviewClose");
const dictationReviewText = document.querySelector("#dictationReviewText");
const dictationReviewField = document.querySelector(".dictation-review-field");
const dictationFieldReview = document.querySelector("#dictationFieldReview");
const dictationReviewMessage = document.querySelector("#dictationReviewMessage");
const dictationReviewSave = document.querySelector("#dictationReviewSave");
const dictationReviewRetry = document.querySelector("#dictationReviewRetry");
const dictationReviewManual = document.querySelector("#dictationReviewManual");
const dictationReviewChange = document.querySelector("#dictationReviewChange");
const dictationStatus = document.querySelector("#dictationStatus");
const todayTaskCount = document.querySelector("#todayTaskCount");
const todayCompletedCount = document.querySelector("#todayCompletedCount");
const todayWaterTotal = document.querySelector("#todayWaterTotal");
const todayarchiveCSummary = document.querySelector("#todayarchiveCSummary");
const todayfocusStateSummary = document.querySelector("#todayfocusStateSummary");
const todayarchiveBummary = document.querySelector("#todayarchiveBummary");
const todayWeeklySummary = document.querySelector("#todayWeeklySummary");
const todayWeeklyProgressFill = document.querySelector("#todayWeeklyProgressFill");
const todayTaskList = document.querySelector("#todayTaskList");
const dashboardJumpButtons = document.querySelectorAll("[data-dashboard-jump]");
const aiRefreshButton = document.querySelector("#aiRefreshButton");
const reviewTodayButton = document.querySelector("#reviewTodayButton");
const aiInsightList = document.querySelector("#aiInsightList");
const dictateButton = document.querySelector("#dictateButton");
const getStartedButton = document.querySelector("#getStartedButton");
const settingsButton = document.querySelector("#settingsButton");
const settingsModal = document.querySelector("#settingsModal");
const settingsPanel = document.querySelector(".settings-panel");
const settingsClose = document.querySelector("#settingsClose");
const settingsSearch = document.querySelector("#settingsSearch");
const accountButton = document.querySelector("#accountButton");
const accountModal = document.querySelector("#accountModal");
const accountDialogPanel = document.querySelector(".account-dialog-panel");
const accountClose = document.querySelector("#accountClose");
const accountStatus = document.querySelector("#accountStatus");
const accountAuthFields = document.querySelector("#accountAuthFields");
const accountEmail = document.querySelector("#accountEmail");
const accountPassword = document.querySelector("#accountPassword");
const accountSignInButton = document.querySelector("#accountSignInButton");
const accountCreateButton = document.querySelector("#accountCreateButton");
const accountResetPasswordButton = document.querySelector("#accountResetPasswordButton");
const accountSignOutButton = document.querySelector("#accountSignOutButton");
const createAccountModal = document.querySelector("#createAccountModal");
const createAccountClose = document.querySelector("#createAccountClose");
const createAccountCancel = document.querySelector("#createAccountCancel");
const createAccountMessage = document.querySelector("#createAccountMessage");
const createAccountEmail = document.querySelector("#createAccountEmail");
const createAccountPassword = document.querySelector("#createAccountPassword");
const createAccountConfirmPassword = document.querySelector("#createAccountConfirmPassword");
const createAccountSubmitButton = document.querySelector("#createAccountSubmitButton");
const themeToggle = document.querySelector("#themeToggle");
const reminderToggle = document.querySelector("#reminderToggle");
const reminderTime = document.querySelector("#reminderTime");
const heightFeet = document.querySelector("#heightFeet");
const heightInches = document.querySelector("#heightInches");
const guestModeToggle = document.querySelector("#guestModeToggle");
const biometricToggle = document.querySelector("#biometricToggle");
const aiExtractionToggle = document.querySelector("#aiExtractionToggle");
const cloudAiToggle = document.querySelector("#cloudAiToggle");
const aiApiKey = document.querySelector("#aiApiKey");
const aiBackendUrl = document.querySelector("#aiBackendUrl");
const aiBackendToken = document.querySelector("#aiBackendToken");
const aiModel = document.querySelector("#aiModel");
const photoAiUsageSetting = document.querySelector("#photoAiUsageSetting");
const upgradeButton = document.querySelector("#upgradeButton");
const exportTrainingDataButton = document.querySelector("#exportTrainingDataButton");
const aiTtsModel = document.querySelector("#aiTtsModel");
const aiTtsVoice = document.querySelector("#aiTtsVoice");
const testAiTtsButton = document.querySelector("#testAiTtsButton");
const installTtsVoiceButton = document.querySelector("#installTtsVoiceButton");
const securityPasswordCurrent = document.querySelector("#securityPasswordCurrent");
const securityPasswordNew = document.querySelector("#securityPasswordNew");
const setPasswordButton = document.querySelector("#setPasswordButton");
const clearPasswordButton = document.querySelector("#clearPasswordButton");
const exportDataButton = document.querySelector("#exportDataButton");
const importDataButton = document.querySelector("#importDataButton");
const importDataFile = document.querySelector("#importDataFile");
const masterResetButton = document.querySelector("#masterResetButton");
const lockModal = document.querySelector("#lockModal");
const lockPasswordField = document.querySelector("#lockPasswordField");
const lockPassword = document.querySelector("#lockPassword");
const lockError = document.querySelector("#lockError");
const unlockButton = document.querySelector("#unlockButton");
const biometricUnlockButton = document.querySelector("#biometricUnlockButton");
const resetPasswordButton = document.querySelector("#resetPasswordButton");
const setupPasswordButton = document.querySelector("#setupPasswordButton");
const setupBiometricButton = document.querySelector("#setupBiometricButton");
const guestModeButton = document.querySelector("#guestModeButton");
const confirmPasswordModal = document.querySelector("#confirmPasswordModal");
const confirmPasswordMessage = document.querySelector("#confirmPasswordMessage");
const confirmPasswordInput = document.querySelector("#confirmPasswordInput");
const confirmPasswordError = document.querySelector("#confirmPasswordError");
const confirmPasswordCancel = document.querySelector("#confirmPasswordCancel");
const confirmPasswordSubmit = document.querySelector("#confirmPasswordSubmit");
const onboardingModal = document.querySelector("#onboardingModal");
const onboardingStepLabel = document.querySelector("#onboardingStepLabel");
const onboardingTitle = document.querySelector("#onboardingTitle");
const onboardingClose = document.querySelector("#onboardingClose");
const onboardingCopy = document.querySelector("#onboardingCopy");
const onboardingForm = document.querySelector("#onboardingForm");
const onboardingActions = document.querySelector("#onboardingActions");
const reviewTodayModal = document.querySelector("#reviewTodayModal");
const reviewTodayClose = document.querySelector("#reviewTodayClose");
const reviewTodayList = document.querySelector("#reviewTodayList");
const quickActionButtons = document.querySelectorAll("[data-quick-action]");
const reminderCenterModal = document.querySelector("#reminderCenterModal");
const reminderCenterClose = document.querySelector("#reminderCenterClose");
const reminderCenterList = document.querySelector("#reminderCenterList");
const floatingAddMenu = document.querySelector("#floatingAddMenu");
const floatingAddButton = document.querySelector("#floatingAddButton");
const archiveBPresetButtons = document.querySelectorAll("[data-archiveB-preset]");
const focusStatePresetButtons = document.querySelectorAll("[data-focusState-preset]");
const taskPresetButtons = document.querySelectorAll("[data-task-preset]");
const appToast = document.querySelector("#appToast");
const overviewModuleMenu = document.querySelector("#overviewModuleMenu");
const overviewTabs = document.querySelectorAll("[data-overview-module]");
const overviewPanels = document.querySelectorAll("[data-overview-panel]");
const focusAreaSection = document.querySelector("#focusAreaSection");
const focusAreaModuleMenu = document.querySelector("#focusAreaModuleMenu");
const focusAreaTabs = document.querySelectorAll("[data-focusArea-module]");
const archiveAPanel = document.querySelector("#archiveAPanel");
const archiveC24Button = document.querySelector("#archiveC24Button");
const archiveC24Modal = document.querySelector("#archiveC24Modal");
const archiveC24Close = document.querySelector("#archiveC24Close");
const archiveBPanel = document.querySelector("#archiveBPanel");
const archiveBForm = document.querySelector("#archiveBForm");
const archiveBDate = document.querySelector("#archiveBDate");
const archiveBName = document.querySelector("#archiveBName");
const archiveBeverity = document.querySelector("#archiveBeverity");
const archiveBNote = document.querySelector("#archiveBNote");
const archiveBList = document.querySelector("#archiveBList");
const archiveBEmpty = document.querySelector("#archiveBEmpty");
const archiveBHistoryButton = document.querySelector("#archiveBHistoryButton");
const archiveBHistoryModal = document.querySelector("#archiveBHistoryModal");
const archiveBHistoryClose = document.querySelector("#archiveBHistoryClose");
const archiveBHistoryRows = document.querySelector("#archiveBHistoryRows");
const archiveBHistoryEmpty = document.querySelector("#archiveBHistoryEmpty");
const focusStatePanel = document.querySelector("#focusStatePanel");
const focusStateForm = document.querySelector("#focusStateForm");
const focusStateDate = document.querySelector("#focusStateDate");
const focusStateName = document.querySelector("#focusStateName");
const focusStateIntensity = document.querySelector("#focusStateIntensity");
const focusStateNote = document.querySelector("#focusStateNote");
const focusStateList = document.querySelector("#focusStateList");
const focusStateEmpty = document.querySelector("#focusStateEmpty");
const focusStateHistoryButton = document.querySelector("#focusStateHistoryButton");
const focusStateHistoryModal = document.querySelector("#focusStateHistoryModal");
const focusStateHistoryClose = document.querySelector("#focusStateHistoryClose");
const focusStateHistoryRows = document.querySelector("#focusStateHistoryRows");
const focusStateHistoryEmpty = document.querySelector("#focusStateHistoryEmpty");
const focusLogPanel = document.querySelector("#focusLogPanel");
const focusLogForm = document.querySelector("#focusLogForm");
const focusLogDate = document.querySelector("#focusLogDate");
const focusLogEntry = document.querySelector("#focusLogEntry");
const focusLogPaperDate = document.querySelector("#focusLogPaperDate");
const focusLogLogLink = document.querySelector("#focusLogLogLink");
const chartsPanel = document.querySelector("#chartsPanel");
const focusAreaModules = ["archiveC", "archiveB", "charts"];
const overviewModules = ["coach"];
let overviewSwipeStartX = 0;
let focusAreaSwipeStartX = 0;
let focusAreaSwipeStartY = 0;
let lastHapticAt = 0;

todayLabel.textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "short",
  day: "numeric"
}).format(new Date());
if (focusLogDate) focusLogDate.value = today;
if (focusLogPaperDate) focusLogPaperDate.textContent = formatShortSlashDate(today);
if (focusLogEntry) updatefocusLogEntryState();
clearfocusStateAndarchiveBForms();
installHapticFeedback();

dashboardJumpButtons.forEach((button) => {
  button.addEventListener("click", () => jumpFromDashboard(button.dataset.dashboardJump));
});
aiRefreshButton.addEventListener("click", renderSmartCoach);
reviewTodayButton.addEventListener("click", reviewToday);
if (DICTATION_FEATURE_ENABLED) {
  dictateButton.hidden = false;
  dictateButton.addEventListener("click", startTaskLensDictation);
} else {
  dictateButton.hidden = true;
  dictationStatus.hidden = true;
}
getStartedButton?.addEventListener("click", startGuidedDataEntry);
quickActionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    floatingAddMenu?.classList.remove("open");
    jumpFromDashboard(button.dataset.quickAction);
  });
});
floatingAddButton?.addEventListener("click", () => {
  openAppHelpBotDialog();
});
reminderCenterClose?.addEventListener("click", () => {
  reminderCenterModal.hidden = true;
});
reminderCenterModal?.addEventListener("click", (event) => {
  if (event.target === reminderCenterModal) {
    reminderCenterModal.hidden = true;
  }
});
archiveBPresetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    archiveBName.value = button.dataset.archiveBPreset || "";
    setfocusAreaModule("archiveB");
    archiveBName.focus();
  });
});
focusStatePresetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!focusStateName || !focusStateNote) return;
    focusStateName.value = button.dataset.focusStatePreset || "Okay";
    setfocusAreaModule("focusState");
    focusStateNote.focus();
  });
});
taskPresetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyTaskPresetButton(button);
  });
});
taskChoiceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const select = document.querySelector(`#${button.dataset.taskChoiceTarget}`);
    if (!select) return;
    select.value = button.dataset.taskChoiceValue || "";
    syncTaskChoiceButtons(select.id);
  });
});
syncTaskChoiceButtons();
photoAiHeroButton?.addEventListener("click", () => {
  if (!requireTaskLensAccount("photo")) return;
  startPhotoAiHeroTask();
});
brainDumpHeroButton?.addEventListener("click", () => {
  if (!requireTaskLensAccount("brain")) return;
  startBrainDumpHeroTask();
});
winsPanel?.addEventListener("click", () => scrollToTaskList());
winsPanel?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  scrollToTaskList();
});
applySettings();
setOverviewModule("coach");
setfocusAreaModule("archiveC");
mountarchiveCHistoryChart();

focusLogEntry?.addEventListener("input", updatefocusLogEntryState);
focusLogDate?.addEventListener("change", () => {
  if (focusLogPaperDate) focusLogPaperDate.textContent = focusLogDate.value ? formatShortSlashDate(focusLogDate.value) : "";
});
focusLogLogLink?.addEventListener("click", openfocusLogLogList);
onboardingClose?.addEventListener("click", closeInitialDataOnboarding);
overviewTabs.forEach((tab) => {
  tab.addEventListener("click", () => setOverviewModule(tab.dataset.overviewModule));
});
overviewModuleMenu?.addEventListener("touchstart", (event) => {
  overviewSwipeStartX = event.touches[0]?.clientX || 0;
}, { passive: true });
overviewModuleMenu?.addEventListener("touchend", (event) => {
  const endX = event.changedTouches[0]?.clientX || overviewSwipeStartX;
  handleOverviewSwipe(endX - overviewSwipeStartX);
});
focusAreaTabs.forEach((tab) => {
  tab.addEventListener("click", () => setfocusAreaModule(tab.dataset.focusAreaModule));
});
[focusAreaSection, archiveAPanel, archiveBPanel, chartsPanel].forEach(bindfocusAreaSwipeTarget);

habitForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = habitName.value.trim();
  const wasEditing = Boolean(editingHabitId);
  const date = normalizeTaskDate(taskDate?.value) || today;

  if (!name) return;

  const task = {
    id: editingHabitId || createHabitId(),
    name,
    date,
    day: weekDays[parseDateKey(date).getDay()],
    category: habitCategory.value || "General",
    time: "",
    deadline: normalizeTaskTime(habitDeadline.value),
    priority: normalizeTaskPriority(habitPriority.value),
    size: normalizeTaskSize(habitSize?.value),
    color: habitColor ? habitColor.value : "#4574fa",
    note: habitNote.value.trim(),
    completions: editingHabitId
      ? habits.find((habit) => habit.id === editingHabitId)?.completions || []
      : []
  };

  habits = editingHabitId
    ? habits.map((habit) => habit.id === editingHabitId ? { ...habit, ...task } : habit)
    : [task, ...habits];

  habitName.value = "";
  habitNote.value = "";
  habitDeadline.value = "";
  if (taskDate) taskDate.value = "";
  habitCategory.value = "General";
  habitPriority.value = "Now";
  if (habitSize) habitSize.value = "Tiny";
  syncTaskChoiceButtons();
  habitForm.querySelector(".primary-button").textContent = "Turn into task";
  editingHabitId = null;
  saveHabits();
  if (task.deadline) {
    requestNotificationPermission();
  }
  render();
  showToast(wasEditing ? "Task saved." : "Task added.");
  if (!wasEditing) {
    openTaskBreakdownPrompt(task);
  }
});

archiveAForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const date = archiveADate.value || today;
  const entry = {
    date,
    recordedAt: new Date().toISOString(),
    valueA: parsearchiveANumber(valueA.value),
    valueB: parsearchiveANumber(valueB.value),
    valueC: getvalueCInPoundsForSave(),
    phasePhase: phasePhase.value || null,
    valueD: parsearchiveANumber(valueD.value),
    systolic: parsearchiveANumber(systolic.value),
    diastolic: parsearchiveANumber(diastolic.value),
    water: parsearchiveANumber(water.value)
  };

  archiveAEntries = [
    entry,
    ...archiveAEntries.filter((item) => item.date !== date)
  ].sort((first, second) => second.date.localeCompare(first.date));

  savearchiveAEntries();
  renderarchiveA();
  renderGraph();
  showToast("archiveA and archiveC saved.");
});

archiveBForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = archiveBName.value.trim();
  if (!name) return;
  archiveBEntries = [{
    id: createHabitId(),
    date: archiveBDate.value || today,
    recordedAt: new Date().toISOString(),
    name,
    severity: archiveBeverity.value || "Mild",
    note: archiveBNote.value.trim()
  }, ...archiveBEntries];
  archiveBDate.value = "";
  archiveBName.value = "";
  archiveBeverity.value = "";
  archiveBNote.value = "";
  savearchiveBEntries();
  renderarchiveB();
  renderarchiveBHistory();
  maybeSendfocusAreaTrendNotification("archiveB");
  showToast("archiveB logged.");
});

focusStateForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  focusStateEntries = [{
    id: createHabitId(),
    date: focusStateDate.value || today,
    recordedAt: new Date().toISOString(),
    name: focusStateName.value || "Okay",
    intensity: focusStateIntensity.value || "Moderate",
    note: focusStateNote.value.trim()
  }, ...focusStateEntries];
  focusStateDate.value = "";
  focusStateName.value = "";
  focusStateIntensity.value = "";
  focusStateNote.value = "";
  savefocusStateEntries();
  renderfocusStates();
  renderfocusStateHistory();
  maybeSendfocusAreaTrendNotification("focusState");
  showToast("focusState logged.");
});

focusLogForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = focusLogEntry.value.trim();
  if (!text) return;
  focusLogEntries = [{
    id: createHabitId(),
    date: focusLogDate.value || today,
    text
  }, ...focusLogEntries];
  focusLogEntry.value = "";
  updatefocusLogEntryState();
  savefocusLogEntries();
  handleImmediatefocusLogSafetySignal(text);
  renderfocusLog();
  scheduleSmartCoachRender();
  maybeSendfocusAreaTrendNotification("focusLog");
  scanfocusLogAndAppWithAiForSafety(text);
  showToast("focusLog entry saved.");
});

waterGlasses?.addEventListener("click", (event) => {
  const button = event.target.closest(".water-glass");
  if (!button) return;
  const selectedGlasses = Number(button.dataset.glassIndex);
  if (!Number.isFinite(selectedGlasses)) return;
  setWaterExpanded(true);
  setWaterAmount(selectedGlasses * WATER_GLASS_OZ);
});

waterToggle?.addEventListener("click", () => {
  setWaterExpanded(true);
});

waterClear?.addEventListener("click", () => {
  setWaterAmount(null);
});

archiveC24Button?.addEventListener("click", () => {
  renderarchiveA();
  archiveC24Modal.hidden = false;
});

archiveC24Close?.addEventListener("click", () => {
  archiveC24Modal.hidden = true;
});

archiveC24Modal?.addEventListener("click", (event) => {
  if (event.target === archiveC24Modal) {
    archiveC24Modal.hidden = true;
  }
});

importreading?.addEventListener("click", () => {
  importreadingFromWatch();
});

convertvalueC?.addEventListener("click", () => {
  togglevalueCUnit();
});

valueC?.addEventListener("input", () => {
  valueCUnit = "lb";
  updatevalueCConvertButton();
});

historyButton?.addEventListener("click", () => {
  if (archiveCHistoryDropdown) {
    setfocusAreaModule("charts");
    archiveCHistoryDropdown.open = true;
    syncHistoryControls();
    renderHistory();
    archiveCHistoryDropdown.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  syncHistoryControls();
  renderHistory();
  historyModal.hidden = false;
});

historyFocusDate?.addEventListener("change", () => {
  historyFocusDateKey = historyFocusDate.value || today;
  renderHistory();
});

historyZoomRange?.addEventListener("input", () => {
  historyZoomDays = Number(historyZoomRange.value) || HISTORY_RETENTION_DAYS;
  renderHistory();
});

historyRangeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    historyZoomDays = Number(button.dataset.historyDays) || HISTORY_RETENTION_DAYS;
    historyZoomRange.value = String(historyZoomDays);
    updateHistoryZoomLabel();
    renderHistory();
  });
});

historyLegendButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const metric = button.dataset.historyMetric || "all";
    historyMetricFilter.value = metric;
    renderHistory();
  });
});

historyMetricFilter?.addEventListener("change", () => {
  renderHistory();
});

historyClose?.addEventListener("click", () => {
  historyModal.hidden = true;
});

historyModal?.addEventListener("click", (event) => {
  if (event.target === historyModal) {
    historyModal.hidden = true;
  }
});
masterChartRangeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    masterChartRangeDays = Number(button.dataset.masterChartDays) || HISTORY_RETENTION_DAYS;
    renderMasterChart();
  });
});
masterChartButton?.addEventListener("click", openMasterChart);
masterChartClose?.addEventListener("click", () => {
  masterChartModal.hidden = true;
});
masterChartModal?.addEventListener("click", (event) => {
  if (event.target === masterChartModal) {
    masterChartModal.hidden = true;
  }
});

archiveBHistoryButton?.addEventListener("click", () => {
  renderarchiveBHistory();
  archiveBHistoryModal.hidden = false;
});

archiveBHistoryClose?.addEventListener("click", () => {
  archiveBHistoryModal.hidden = true;
});

archiveBHistoryModal?.addEventListener("click", (event) => {
  if (event.target === archiveBHistoryModal) {
    archiveBHistoryModal.hidden = true;
  }
});

focusStateHistoryButton?.addEventListener("click", () => {
  renderfocusStateHistory();
  focusStateHistoryModal.hidden = false;
});

focusStateHistoryClose?.addEventListener("click", () => {
  focusStateHistoryModal.hidden = true;
});

focusStateHistoryModal?.addEventListener("click", (event) => {
  if (event.target === focusStateHistoryModal) {
    focusStateHistoryModal.hidden = true;
  }
});

affirmationModal.addEventListener("click", (event) => {
  if (event.target === affirmationModal) {
    closeAffirmationModal();
  }
});

dictationReviewClose.addEventListener("click", closeDictationReview);
dictationReviewModal.addEventListener("click", (event) => {
  if (event.target === dictationReviewModal) {
    closeDictationReview();
  }
});
dictationReviewSave.addEventListener("click", saveReviewedDictation);
dictationReviewRetry.addEventListener("click", () => {
  if (!DICTATION_FEATURE_ENABLED) return;
  startTaskLensDictation({ appendToReview: true });
});
dictationReviewManual.addEventListener("click", () => {
  pendingDictationExtraction = null;
  pendingDictationTranscript = "";
  pendingParsedDictationResult = null;
  pendingParsedDictationDocument = null;
  dictationReviewField.hidden = false;
  dictationFieldReview.hidden = true;
  dictationFieldReview.replaceChildren();
  dictationReviewManual.hidden = false;
  dictationReviewChange.hidden = true;
  dictationReviewSave.textContent = "Confirm & Save";
  dictationReviewText.value = "";
  dictationReviewText.focus();
});
dictationReviewChange.addEventListener("click", changeReviewedDictation);
reviewTodayClose.addEventListener("click", () => {
  reviewTodayModal.hidden = true;
});
reviewTodayModal.addEventListener("click", (event) => {
  if (event.target === reviewTodayModal) {
    reviewTodayModal.hidden = true;
  }
});

function openSettingsMenu() {
  if (!settingsModal || !settingsPanel) return;
  settingsModal.hidden = false;
  settingsModal.removeAttribute("hidden");
  settingsModal.style.display = "grid";
  settingsModal.style.zIndex = "9999";
  settingsModal.scrollTop = 0;
  settingsPanel.scrollTop = 0;
  updateDialogScrollLock();
  try {
    renderSettings();
    setSettingsPasswordFieldTypes("password");
  } catch (error) {
    console.error("Settings render failed.", error);
    showToast("Settings opened.");
  }
}

window.openTaskLensSettings = openSettingsMenu;

settingsButton?.addEventListener("click", () => {
  openSettingsMenu();
});

function openAccountMenu() {
  if (!accountModal || !accountDialogPanel) return;
  accountModal.hidden = false;
  accountModal.removeAttribute("hidden");
  accountModal.style.display = "grid";
  accountModal.style.zIndex = "9999";
  accountModal.scrollTop = 0;
  accountDialogPanel.scrollTop = 0;
  renderTaskLensAccountSettings();
  renderSettings();
  updateDialogScrollLock();
  if (!taskLensAuthSession?.refreshToken) {
    setTimeout(() => accountEmail?.focus(), 60);
  }
}

window.openTaskLensAccount = openAccountMenu;
accountButton?.addEventListener("click", openAccountMenu);
accountClose?.addEventListener("click", () => {
  accountModal.hidden = true;
  accountModal.style.display = "";
  accountModal.style.zIndex = "";
  updateDialogScrollLock();
});
accountModal?.addEventListener("click", (event) => {
  if (event.target !== accountModal) return;
  accountModal.hidden = true;
  accountModal.style.display = "";
  accountModal.style.zIndex = "";
  updateDialogScrollLock();
});

function openCreateAccountDialog() {
  if (!createAccountModal) return;
  createAccountModal.hidden = false;
  createAccountModal.removeAttribute("hidden");
  createAccountModal.style.display = "grid";
  createAccountModal.style.zIndex = "10000";
  createAccountModal.scrollTop = 0;
  if (createAccountMessage) createAccountMessage.textContent = "Create your account, then sign in to continue.";
  if (createAccountEmail && accountEmail?.value) createAccountEmail.value = accountEmail.value;
  if (createAccountPassword) createAccountPassword.value = "";
  if (createAccountConfirmPassword) createAccountConfirmPassword.value = "";
  updateDialogScrollLock();
  setTimeout(() => (createAccountEmail?.value ? createAccountPassword : createAccountEmail)?.focus(), 60);
}

function closeCreateAccountDialog() {
  if (!createAccountModal) return;
  createAccountModal.hidden = true;
  createAccountModal.style.display = "";
  createAccountModal.style.zIndex = "";
  updateDialogScrollLock();
}

createAccountClose?.addEventListener("click", closeCreateAccountDialog);
createAccountCancel?.addEventListener("click", closeCreateAccountDialog);
createAccountModal?.addEventListener("click", (event) => {
  if (event.target !== createAccountModal) return;
  closeCreateAccountDialog();
});

function isTaskLensAccountSignedIn() {
  return Boolean(taskLensAuthSession?.refreshToken);
}

function requireTaskLensAccount(actionName) {
  if (isTaskLensAccountSignedIn()) return true;
  pendingAccountAction = actionName || "";
  openAccountMenu();
  showToast("Sign in or create an account to continue.");
  return false;
}

function runPendingAccountAction() {
  const action = pendingAccountAction;
  pendingAccountAction = "";
  if (action === "photo") {
    startPhotoAiHeroTask();
    return;
  }
  if (action === "brain") {
    startBrainDumpHeroTask();
  }
}

function startBrainDumpHeroTask() {
  habitName.focus();
  habitName.scrollIntoView({ behavior: "smooth", block: "center" });
}

settingsClose?.addEventListener("click", () => {
  settingsModal.hidden = true;
  settingsModal.style.display = "";
  settingsModal.style.zIndex = "";
  setSettingsPasswordFieldTypes("text");
});

settingsModal?.addEventListener("click", (event) => {
  if (event.target === settingsModal) {
    settingsModal.hidden = true;
    settingsModal.style.display = "";
    settingsModal.style.zIndex = "";
    setSettingsPasswordFieldTypes("text");
  }
});
settingsSearch?.addEventListener("input", filterSettings);

accountSignInButton?.addEventListener("click", () => signInTaskLensAccount());
accountCreateButton?.addEventListener("click", openCreateAccountDialog);
createAccountSubmitButton?.addEventListener("click", () => createTaskLensAccount());
accountResetPasswordButton?.addEventListener("click", () => sendTaskLensPasswordReset());
accountSignOutButton?.addEventListener("click", signOutTaskLensAccount);
accountPassword?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") signInTaskLensAccount();
});
createAccountConfirmPassword?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") createTaskLensAccount();
});
themeToggle?.addEventListener("change", () => updateSetting("theme", themeToggle.checked ? "dark" : "light"));
reminderToggle?.addEventListener("change", () => updateSetting("remindersEnabled", reminderToggle.checked));
reminderTime?.addEventListener("change", () => updateSetting("reminderTime", reminderTime.value));
heightFeet?.addEventListener("change", () => updateHeightSetting());
heightInches?.addEventListener("change", () => updateHeightSetting());
aiExtractionToggle?.addEventListener("change", () => updateSetting("aiExtractionEnabled", aiExtractionToggle.checked));
cloudAiToggle?.addEventListener("change", () => updateCloudAiSharing(cloudAiToggle.checked));
aiApiKey?.addEventListener("change", () => {
  aiApiKey.value = "";
  updateSetting("aiApiKey", "");
  showToast("OpenAI keys belong on the secure backend, not inside the app.");
});
aiBackendUrl?.addEventListener("change", () => updateSetting("aiBackendUrl", normalizeAiBackendUrlInput(aiBackendUrl.value)));
aiBackendToken?.addEventListener("change", () => updateSetting("aiBackendToken", aiBackendToken.value.trim()));
aiModel?.addEventListener("change", () => updateSetting("aiModel", aiModel.value.trim()));
upgradeButton?.addEventListener("click", () => {
  window.alert(`TaskLens Premium\n\nFree: ${FREE_PHOTO_AI_LIMIT} photo checklists per month.\nPremium: ${PREMIUM_MONTHLY_PRICE} or ${PREMIUM_YEARLY_PRICE}.\n\nCheckout is not available in this build yet.`);
});
aiTtsModel?.addEventListener("change", () => updateSetting("aiTtsModel", aiTtsModel.value.trim()));
aiTtsVoice?.addEventListener("change", () => updateSetting("aiTtsVoice", aiTtsVoice.value));
testAiTtsButton?.addEventListener("click", testAiTextToSpeech);
installTtsVoiceButton?.addEventListener("click", installPhoneTextToSpeechVoiceData);
guestModeToggle?.addEventListener("change", () => updateGuestModeSetting(guestModeToggle.checked));
setPasswordButton?.addEventListener("click", () => setAppPassword());
clearPasswordButton?.addEventListener("click", () => clearAppPassword());
biometricToggle?.addEventListener("change", () => updateBiometricSetting());
unlockButton?.addEventListener("click", () => unlockWithPassword());
lockPassword?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  if (setupPasswordButton.hidden) unlockWithPassword();
  else completeSecuritySetup();
});
biometricUnlockButton?.addEventListener("click", () => unlockWithBiometric());
resetPasswordButton?.addEventListener("click", () => resetAppSecurityFromLock());
setupPasswordButton?.addEventListener("click", () => completeSecuritySetup());
setupBiometricButton?.addEventListener("click", () => completeBiometricSecuritySetup());
guestModeButton?.addEventListener("click", () => continueAsGuest());
confirmPasswordCancel?.addEventListener("click", () => closeConfirmPasswordDialog(false));
confirmPasswordSubmit?.addEventListener("click", () => submitConfirmPasswordDialog());
confirmPasswordInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") submitConfirmPasswordDialog();
});
confirmPasswordModal?.addEventListener("click", (event) => {
  if (event.target === confirmPasswordModal) closeConfirmPasswordDialog(false);
});
exportDataButton?.addEventListener("click", exportAppData);
exportTrainingDataButton?.addEventListener("click", exportAiTrainingData);
importDataButton?.addEventListener("click", () => importDataFile?.click());
importDataFile?.addEventListener("change", importAppData);
masterResetButton?.addEventListener("click", masterResetAppData);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !affirmationModal.hidden) {
    closeAffirmationModal();
    return;
  }
  if (event.key === "Escape" && historyModal && !historyModal.hidden) {
    historyModal.hidden = true;
  }
  if (event.key === "Escape" && archiveBHistoryModal && !archiveBHistoryModal.hidden) {
    archiveBHistoryModal.hidden = true;
  }
  if (event.key === "Escape" && focusStateHistoryModal && !focusStateHistoryModal.hidden) {
    focusStateHistoryModal.hidden = true;
  }
  if (event.key === "Escape" && !settingsModal.hidden) {
    settingsModal.hidden = true;
  }
  if (event.key === "Escape" && createAccountModal && !createAccountModal.hidden) {
    closeCreateAccountDialog();
    return;
  }
  if (event.key === "Escape" && accountModal && !accountModal.hidden) {
    accountModal.hidden = true;
  }
});

document.addEventListener("click", (event) => {
  if (waterExpanded && !waterControl.contains(event.target)) {
    setWaterExpanded(false);
  }
});

window.addEventListener("scroll", () => {
  if (waterExpanded) {
    setWaterExpanded(false);
  }
}, { passive: true });

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (!appUnlocked && isAppLockEnabled() && !dictationActive) {
      hiddenAt = 0;
      showAppLock();
      return;
    }
    if (appUnlocked && hiddenAt && Date.now() - hiddenAt >= 5 * 60 * 1000) {
      showDailyAffirmation();
    }
    hiddenAt = 0;
  } else {
    hiddenAt = Date.now();
    if (appUnlocked && isAppLockEnabled() && !dictationActive) {
      lockAppAfterBackground();
    }
  }
});

window.addEventListener("pageshow", (event) => {
  scrollAppToTop();
  if (!appUnlocked && isAppLockEnabled() && !dictationActive) {
    showAppLock();
    return;
  }
  if (appUnlocked && event.persisted) {
    showDailyAffirmation();
  }
});

function scrollAppToTop() {
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
}

window.setInterval(() => {
  checkTaskReminder();
  checkTaskDeadlineReminders();
  checkUpcomingTaskReminders();
}, 30000);

if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}

function render() {
  habitList.textContent = "";
  const tasksByDay = groupTasksByDay();
  const fragment = document.createDocumentFragment();
  [...tasksByDay.entries()].forEach(([dateKey, dayHabits]) => {
    const dayName = weekDays[parseDateKey(dateKey).getDay()];
    fragment.appendChild(renderDaySection(dayName, dateKey, dayHabits));
  });
  habitList.appendChild(fragment);

  emptyState.hidden = habits.length > 0;
  renderWinsPanel();
  renderTodayDashboard();
  scheduleSmartCoachRender();
  renderGraph();
  maybePromptBackupReminder();
}

function applyTaskPresetButton(button) {
  habitName.value = button.dataset.taskPreset || "";
  if (button.dataset.taskNotePreset && habitNote) {
    habitNote.value = button.dataset.taskNotePreset;
    habitNote.focus();
  } else {
    habitName.focus();
  }
  habitName.scrollIntoView({ behavior: "smooth", block: "center" });
}

function startPhotoAiHeroTask() {
  const task = createTaskDraft({
    name: "Photo checklist",
    category: "Home",
    priority: "Now",
    size: "Tiny",
    note: "Take a photo of the stuck area so AI can turn visible clutter, blockers, and next steps into a checklist."
  });
  openTaskBreakdownPrompt(task, { cancelDeletesTask: true });
}

function syncTaskChoiceButtons(targetId = "") {
  taskChoiceButtons.forEach((button) => {
    if (targetId && button.dataset.taskChoiceTarget !== targetId) return;
    const select = document.querySelector(`#${button.dataset.taskChoiceTarget}`);
    const isActive = Boolean(select && select.value === button.dataset.taskChoiceValue);
    button.classList.toggle("is-selected", isActive);
    button.setAttribute("aria-checked", String(isActive));
  });
}

function scrollToTaskList() {
  const firstTaskCard = habitList?.querySelector(".habit-card");
  const target = firstTaskCard || habitForm;
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (firstTaskCard) {
    firstTaskCard.focus?.({ preventScroll: true });
  } else {
    habitName?.focus?.({ preventScroll: true });
  }
}

function renderWinsPanel() {
  if (!winsSummary || !winsList) return;
  const wins = getTaskWins();
  const completedStepCount = Object.values(taskBreakdowns)
    .flatMap((breakdown) => Array.isArray(breakdown?.steps) ? breakdown.steps : [])
    .filter((step) => step.done).length;
  winsSummary.textContent = `${wins.length} win${wins.length === 1 ? "" : "s"}`;
  winsList.textContent = "";
  if (!wins.length) {
    const empty = document.createElement("p");
    empty.className = "wins-empty";
    empty.textContent = completedStepCount
      ? `${completedStepCount} checklist step${completedStepCount === 1 ? "" : "s"} checked. Add an after photo to save a visible win.`
      : "Complete checklist steps or add an after photo to build proof of progress.";
    winsList.appendChild(empty);
    return;
  }
  wins.slice(0, 3).forEach((win) => {
    const card = document.createElement("article");
    const title = document.createElement("strong");
    const detail = document.createElement("span");
    card.className = "win-card";
    title.textContent = win.taskName;
    detail.textContent = `${win.doneSteps}/${win.totalSteps} steps done${win.hasAfterPhoto ? " • after photo saved" : ""}`;
    card.append(title, detail);
    if (win.beforeImage || win.afterImage) {
      const media = document.createElement("div");
      media.className = "win-card-media";
      [win.beforeImage, win.afterImage].filter(Boolean).forEach((src) => {
        const image = document.createElement("img");
        image.src = src;
        image.alt = "";
        media.appendChild(image);
      });
      card.appendChild(media);
    }
    winsList.appendChild(card);
  });
}

function getTaskWins() {
  return Object.entries(taskBreakdowns)
    .map(([taskId, breakdown]) => {
      const task = habits.find((habit) => habit.id === taskId);
      const steps = Array.isArray(breakdown?.steps) ? breakdown.steps : [];
      const doneSteps = steps.filter((step) => step.done).length;
      return {
        taskName: task?.name || breakdown?.title || "Checklist",
        doneSteps,
        totalSteps: steps.length,
        hasAfterPhoto: Boolean(breakdown?.afterImageDataUrl),
        beforeImage: breakdown?.sourceImageDataUrl || "",
        afterImage: breakdown?.afterImageDataUrl || "",
        generatedAt: breakdown?.generatedAt || ""
      };
    })
    .filter((win) => win.doneSteps > 0 || win.hasAfterPhoto)
    .sort((first, second) => String(second.generatedAt).localeCompare(String(first.generatedAt)));
}

function clearfocusStateAndarchiveBForms() {
  if (archiveBDate) archiveBDate.value = "";
  if (archiveBName) archiveBName.value = "";
  if (archiveBeverity) archiveBeverity.value = "";
  if (archiveBNote) archiveBNote.value = "";
  if (focusStateDate) focusStateDate.value = "";
  if (focusStateName) focusStateName.value = "";
  if (focusStateIntensity) focusStateIntensity.value = "";
  if (focusStateNote) focusStateNote.value = "";
}

function groupTasksByDay() {
  const tasksByDay = new Map();
  habits.forEach((habit) => {
    const dateKey = getTaskDateKey(habit);
    if (!tasksByDay.has(dateKey)) tasksByDay.set(dateKey, []);
    tasksByDay.get(dateKey).push(habit);
  });
  return new Map([...tasksByDay.entries()].sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate)));
}

function getTaskCompletionPercent(dateKey) {
  const tasksForDate = habits.filter((habit) => isTaskScheduledForDate(habit, dateKey));
  if (!tasksForDate.length) return null;
  const completed = tasksForDate.filter((habit) => (habit.completions || []).includes(dateKey)).length;
  return Math.round((completed / tasksForDate.length) * 100);
}

function renderDaySection(dayName, dateKey, dayHabits) {
  const section = document.createElement("section");
  section.className = "day-section";
  section.dataset.day = dayName;
  section.dataset.date = dateKey;
  section.classList.toggle("today", dateKey === today);
  if (dateKey === today) {
    section.id = "todayTasksSection";
  }

  const total = dayHabits.length;
  const complete = dayHabits.filter((habit) => habit.completions.includes(dateKey)).length;
  const percentComplete = total ? Math.round((complete / total) * 100) : 0;

  const header = document.createElement("div");
  header.className = "day-section-header";
  header.tabIndex = 0;
  header.setAttribute("role", "button");
  header.setAttribute("aria-label", `Open ${dayName} to-do list`);

  const titleWrap = document.createElement("div");
  titleWrap.className = "day-section-title";
  const title = document.createElement("h2");
  title.textContent = dayName;
  const subtitle = document.createElement("p");
  subtitle.textContent = `${formatarchiveBHistoryDate(dateKey)} - ${total} task${total === 1 ? "" : "s"}`;
  titleWrap.append(title, subtitle);

  const percent = document.createElement("span");
  percent.className = "day-section-percent";
  percent.textContent = `${percentComplete}%`;
  percent.title = total
    ? `${complete} of ${total} tasks completed for ${formatarchiveBHistoryDate(dateKey)}`
    : `No tasks scheduled for ${formatarchiveBHistoryDate(dateKey)}`;

  header.append(titleWrap, percent);
  header.addEventListener("click", () => openDayTaskDialog(dayName, dateKey));
  header.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDayTaskDialog(dayName, dateKey);
    }
  });

  const list = document.createElement("div");
  list.className = "day-task-list";

  if (dayHabits.length === 0) {
    const empty = document.createElement("p");
    empty.className = "day-empty";
    empty.textContent = "No tasks for this day yet.";
    list.appendChild(empty);
  } else {
    const fragment = document.createDocumentFragment();
    const recentDays = getRecentDays();
    dayHabits.forEach((habit) => {
      fragment.appendChild(renderTaskCard(habit, dateKey, dayName, recentDays));
    });
    list.appendChild(fragment);
  }

  section.append(header, list);
  return section;
}

function renderTaskCard(habit, dateKey, dayName, recentDays = getRecentDays()) {
  const fragment = habitTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".habit-card");
  const checkButton = fragment.querySelector(".check-button");
  const deleteButton = fragment.querySelector(".delete-button");
  const title = fragment.querySelector("h2");
  const streak = fragment.querySelector(".streak");
  const weekScore = fragment.querySelector(".week-score");
  const attributes = fragment.querySelector(".habit-attributes");
  const note = fragment.querySelector(".habit-note");
  const calendarLink = fragment.querySelector(".calendar-link");
  const breakdown = taskBreakdowns[String(habit.id || "")];
  const completedToday = habit.completions.includes(dateKey);
  const completedThisWeek = recentDays.filter((day) => habit.completions.includes(day.key)).length;
  const detailItems = [
    dayName,
    formatTaskDeadline(habit.deadline),
    habit.category || "General",
    normalizeTaskPriority(habit.priority),
    normalizeTaskSize(habit.size)
  ].filter(Boolean);

  card.style.setProperty("--habit-color", habit.color);
  card.classList.toggle("done", completedToday);
  title.textContent = habit.name;
  streak.textContent = `${getTaskStreak(habit, dateKey)} week streak`;
  weekScore.textContent = `${completedThisWeek}/7 this week`;
  note.textContent = habit.note || "";
  note.hidden = !habit.note;
  const photoThumb = buildTaskCardPhotoThumb(breakdown);
  const checklistMeta = buildTaskCardChecklistMeta(breakdown);
  if (photoThumb) title.before(photoThumb);
  if (checklistMeta) note.after(checklistMeta);
  calendarLink.href = getGoogleCalendarUrl(habit);
  calendarLink.textContent = "Calendar";
  const aiStepsButton = document.createElement("button");
  const stuckButton = document.createElement("button");
  const focusButton = document.createElement("button");
  aiStepsButton.className = "calendar-link task-ai-steps-button";
  aiStepsButton.type = "button";
  aiStepsButton.textContent = "AI list";
  stuckButton.className = "calendar-link task-stuck-button";
  stuckButton.type = "button";
  stuckButton.textContent = "Stuck";
  focusButton.className = "calendar-link task-focus-button";
  focusButton.type = "button";
  focusButton.textContent = "Focus";
  calendarLink.after(aiStepsButton, stuckButton, focusButton);
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Open ${habit.name} checklist and photos`);
  card.title = "Open checklist and photos";

  detailItems.forEach((item) => {
    const chip = document.createElement("span");
    chip.textContent = item;
    if (["Now", "Next", "Later"].includes(item)) chip.dataset.when = item.toLowerCase();
    if (["Tiny", "Small", "Medium", "Big"].includes(item)) chip.dataset.size = item.toLowerCase();
    attributes.appendChild(chip);
  });

  card.addEventListener("click", (event) => {
    if (isTaskCardControl(event.target)) return;
    openTaskBreakdownDialog(habit);
  });
  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (isTaskCardControl(event.target)) return;
    event.preventDefault();
    openTaskBreakdownDialog(habit);
  });
  checkButton.addEventListener("click", () => toggleHabit(habit.id, dateKey));
  deleteButton.addEventListener("click", () => deleteHabit(habit.id));
  aiStepsButton.addEventListener("click", () => openTaskBreakdownDialog(habit));
  stuckButton.addEventListener("click", () => openTaskStuckDialog(habit));
  focusButton.addEventListener("click", () => openTaskFocusDialog(habit));

  return fragment;
}

function buildTaskCardPhotoThumb(breakdown) {
  const imageDataUrl = String(breakdown?.sourceImageDataUrl || "").startsWith("data:image/")
    ? String(breakdown.sourceImageDataUrl)
    : "";
  if (!imageDataUrl) return null;
  const image = document.createElement("img");
  image.className = "habit-photo-thumb";
  image.src = imageDataUrl;
  image.alt = "";
  image.loading = "lazy";
  return image;
}

function buildTaskCardChecklistMeta(breakdown) {
  const steps = Array.isArray(breakdown?.steps) ? breakdown.steps : [];
  if (!steps.length) return null;
  const doneCount = steps.filter((step) => step?.done).length;
  const meta = document.createElement("div");
  const progress = document.createElement("span");
  const after = document.createElement("span");
  meta.className = "habit-checklist-meta";
  progress.textContent = `${doneCount}/${steps.length} checklist`;
  after.textContent = getTaskBreakdownAfterImageDataUrl(breakdown) ? "After ready" : (breakdown.targetImagePending ? "After building" : "Photo task");
  meta.append(progress, after);
  return meta;
}

function isTaskCardControl(target) {
  return Boolean(target?.closest?.("button, a, input, textarea, select, label"));
}

function renderTodayDashboard() {
  if (!todayCompletedCount || !todayTaskList) return;
  const summary = getTodaySummary();
  const todayTasks = summary.tasks;
  const complete = summary.completedTasks.length;
  const latestEntry = summary.latestEntry;
  const todayfocusState = summary.focusState;
  const todayarchiveB = summary.archiveB;
  const weeklyTotals = getWeeklyTotals();
  if (todayTaskCount) {
    todayTaskCount.textContent = `${todayTasks.length} task${todayTasks.length === 1 ? "" : "s"}`;
  }
  todayCompletedCount.textContent = `${complete}/${todayTasks.length}`;
  if (todayWaterTotal) {
    const waterGoal = getDailyWaterGoal();
    todayWaterTotal.textContent = latestEntry && Number.isFinite(latestEntry.water)
      ? `${formatWholeNumber(latestEntry.water)}/${formatWholeNumber(waterGoal)} oz`
      : `0/${formatWholeNumber(waterGoal)} oz`;
  }
  if (todayarchiveCSummary) {
    todayarchiveCSummary.textContent = latestEntry
      ? [formatreading(latestEntry.systolic, latestEntry.diastolic), Number.isFinite(latestEntry.valueD) ? `${formatWholeNumber(latestEntry.valueD)} reading` : ""].filter((value) => value && value !== "--").join(" / ") || "--"
      : "--";
  }
  if (todayfocusStateSummary) todayfocusStateSummary.textContent = todayfocusState ? todayfocusState.name : "--";
  if (todayarchiveBummary) todayarchiveBummary.textContent = todayarchiveB.length ? String(todayarchiveB.length) : "0";
  if (todayWeeklySummary) todayWeeklySummary.textContent = `${weeklyTotals.average}%`;
  if (todayWeeklyProgressFill) {
    todayWeeklyProgressFill.style.width = `${Math.max(0, Math.min(100, weeklyTotals.average))}%`;
    todayWeeklyProgressFill.textContent = `${weeklyTotals.average}%`;
    todayWeeklyProgressFill.parentElement.setAttribute("aria-label", `Weekly task progress ${weeklyTotals.average}%, ${weeklyTotals.totalComplete} of ${weeklyTotals.totalTasks} tasks completed`);
  }
  renderWeeklyTaskPercentBar(weeklyTotals.totalComplete, weeklyTotals.totalTasks, weeklyTotals.average);
  todayTaskList.textContent = "";
  if (!todayTasks.length) {
    const empty = document.createElement("p");
    empty.className = "day-empty";
    empty.textContent = "No tasks scheduled for today.";
    todayTaskList.appendChild(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  todayTasks.forEach((task) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "today-task-row";
    row.classList.toggle("done", task.completions.includes(today));
    row.textContent = task.name;
    row.addEventListener("click", () => toggleHabit(task.id, today));
    fragment.appendChild(row);
  });
  todayTaskList.appendChild(fragment);
}

function getTodaySummary() {
  const todayName = weekDays[new Date().getDay()];
  const tasks = habits.filter((habit) => isTaskScheduledForDate(habit, today));
  const completedTasks = tasks.filter((habit) => habit.completions.includes(today));
  const incompleteTasks = tasks.filter((habit) => !habit.completions.includes(today));
  return {
    todayName,
    tasks,
    completedTasks,
    incompleteTasks,
    entry: archiveAEntries.find((entry) => entry.date === today) || null,
    latestEntry: archiveAEntries[0] || null,
    archiveB: archiveBEntries.filter((entry) => entry.date === today)
  };
}

function scheduleSmartCoachRender(delay = 120) {
  window.clearTimeout(smartCoachRenderTimer);
  smartCoachRenderTimer = window.setTimeout(() => {
    smartCoachRenderTimer = null;
    renderSmartCoach();
  }, delay);
}

function renderSmartCoach() {
  const insights = getSmartCoachInsights();
  const coachCacheKey = getAiCoachSnapshotKey();
  const visibleInsights = aiCoachInsight && aiCoachCacheKey === coachCacheKey
    ? [aiCoachInsight, ...insights]
    : insights;
  aiInsightList.textContent = "";
  visibleInsights.slice(0, 5).forEach((insight) => {
    aiInsightList.appendChild(renderSmartCoachCard(insight));
  });
  loadAiCoachInsight(coachCacheKey, insights);
}

function renderSmartCoachCard(insight) {
  const card = document.createElement("article");
  const badge = document.createElement("span");
  card.className = "ai-insight-card";
  card.dataset.tone = insight.tone || "neutral";
  if (insight.destination) {
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${insight.title}, ${insight.actionLabel || "open section"}`);
    card.addEventListener("click", () => jumpFromDashboard(insight.destination));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        jumpFromDashboard(insight.destination);
      }
    });
  }
  badge.className = "trend-badge";
  badge.textContent = getInsightLabel(insight);
  const title = document.createElement("strong");
  const body = document.createElement("p");
  title.textContent = insight.title;
  body.textContent = insight.body;
  card.append(badge, title, body, renderMiniSparkline(insight));

  if (!insight.destination && insight.suggestedTask) {
    const nextStep = document.createElement("p");
    nextStep.className = "coach-next-step";
    nextStep.textContent = insight.suggestedTask || "Review this today";
    card.appendChild(nextStep);
  }

  if (insight.destination) {
    const button = document.createElement("button");
    button.className = "text-button ai-add-task";
    button.type = "button";
    button.textContent = insight.actionLabel || "Go";
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      jumpFromDashboard(insight.destination);
    });
    card.appendChild(button);
  } else if (insight.suggestedTask) {
    const button = document.createElement("button");
    button.className = "text-button ai-add-task";
    button.type = "button";
    button.textContent = "Add task";
    button.addEventListener("click", () => addSuggestedTask(insight.suggestedTask));
    card.appendChild(button);
  }

  return card;
}

function getInsightLabel(insight) {
  if (insight.aiGenerated) return "AI";
  if (/improving|better|easing|down/i.test(insight.title)) return "Improving";
  if (/slipping|attention|up|declining|increasing/i.test(insight.title)) return "Needs attention";
  if (insight.tone === "support") return "Support";
  if (insight.tone === "care") return "Care";
  if (insight.tone === "action") return "Action";
  return "Stable";
}

function renderMiniSparkline(insight) {
  const sparkline = document.createElement("div");
  const values = getSparklineValues(insight);
  const fragment = document.createDocumentFragment();
  sparkline.className = "mini-sparkline";
  values.forEach((value) => {
    const bar = document.createElement("span");
    bar.style.height = `${Math.max(18, Math.min(100, value))}%`;
    fragment.appendChild(bar);
  });
  sparkline.appendChild(fragment);
  return sparkline;
}

function getSparklineValues(insight) {
  const title = insight.title.toLowerCase();
  if (title.includes("water")) {
    const waterGoal = getDailyWaterGoal();
    return archiveAEntries.slice(0, 7).reverse().map((entry) => Number.isFinite(entry.water) ? Math.min(100, (entry.water / waterGoal) * 100) : 18);
  }
  if (title.includes("valueC")) return getScaledValues(archiveAEntries.slice(0, 7).reverse().map((entry) => entry.valueC));
  if (title.includes("valueD")) return getScaledValues(archiveAEntries.slice(0, 7).reverse().map((entry) => entry.valueD));
  if (title.includes("pressure")) return getScaledValues(archiveAEntries.slice(0, 7).reverse().map((entry) => entry.systolic));
  if (title.includes("focusState")) return focusStateEntries.slice(0, 7).reverse().map((entry) => (getfocusStateScore(entry.name) || 1) * 20);
  if (title.includes("archiveB")) return getRecentDateKeys(7, 0).map((dateKey) => archiveBEntries.filter((entry) => entry.date === dateKey).length * 28 + 18);
  return getWeekStats().map((day) => day.percent || 18);
}

function getScaledValues(values) {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return [24, 38, 34, 46, 44, 58, 54];
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  return values.map((value) => Number.isFinite(value) ? 18 + ((value - min) / range) * 82 : 18);
}

function getSmartCoachInsights() {
  const todayName = weekDays[new Date().getDay()];
  const todayTasks = habits.filter((habit) => isTaskScheduledForDate(habit, today));
  const completedTasks = todayTasks.filter((habit) => habit.completions.includes(today)).length;
  const completionPercent = todayTasks.length ? Math.round((completedTasks / todayTasks.length) * 100) : 0;
  const latestEntry = archiveAEntries[0];
  const latestarchiveB = archiveBEntries[0];
  const waterGoal = getDailyWaterGoal();
  const waterAmount = latestEntry && latestEntry.date === today && Number.isFinite(latestEntry.water) ? latestEntry.water : 0;
  const signalPatternInsight = getSignalPatternInsight();
  const insights = [];

  if (!todayTasks.length) {
    insights.push({
      title: "Plan the day",
      body: "No tasks are scheduled for today. Add one simple task so the weekly progress bar has something real to track.",
      tone: "action",
      destination: "tasks",
      actionLabel: "Create a task"
    });
  } else if (completionPercent < 50) {
    insights.push({
      title: "Pick the next small win",
      body: `${completedTasks} of ${todayTasks.length} tasks are done. Knock out one short task before adding more work.`,
      tone: "action",
      destination: "tasks",
      actionLabel: "Go to tasks"
    });
  } else {
    insights.push({
      title: "Momentum check",
      body: `${completionPercent}% of today's tasks are complete. Keep the list steady and avoid loading the day with extra tasks.`,
      tone: "steady"
    });
  }

  const upcomingTaskInsight = getUpcomingTaskReminderInsight();
  if (upcomingTaskInsight) {
    insights.push(upcomingTaskInsight);
  }

  if (waterAmount < waterGoal) {
    insights.push({
      title: "water nudge",
      body: `${formatWholeNumber(waterAmount)} of ${formatWholeNumber(waterGoal)} oz logged today. A water break is the cleanest next move.`,
      tone: "support",
      destination: "water",
      actionLabel: "Go to water"
    });
  }

  if (latestarchiveB && ["Moderate", "Severe"].includes(latestarchiveB.severity)) {
    insights.push({
      title: "Issue-aware pacing",
      body: `${latestarchiveB.severity} ${latestarchiveB.name.toLowerCase()} is in your recent issue log. Lower intensity tasks make more sense right now.`,
      tone: "care",
      destination: "archiveB",
      actionLabel: "Go to issues"
    });
  }

  if (latestEntry && (latestEntry.systolic >= 130 || latestEntry.diastolic >= 80)) {
    insights.push({
      title: "Signal watch",
      body: `Latest pressure reading is ${formatreading(latestEntry.systolic, latestEntry.diastolic)}. Keep tracking it consistently and avoid treating one reading like the whole story.`,
      tone: "support"
    });
  }

  if (signalPatternInsight) {
    insights.push(signalPatternInsight);
  }

  insights.push(...getLimitInsights(latestEntry, null));
  insights.push(...getDataTrendInsights());

  if (insights.length < 3) {
    insights.push({
      title: "Pattern builder",
      body: "Logging your information today gives the coach better patterns to work with tomorrow.",
      tone: "steady",
      destination: "archiveC",
      actionLabel: "Go to archiveC"
    });
  }

  return insights.slice(0, 4);
}

function getUpcomingTaskReminderInsight() {
  const upcoming = getUpcomingTaskReminderCandidates();
  if (!upcoming.length) return null;
  const next = upcoming[0];
  const when = next.offset === 1 ? "tomorrow" : `${next.dayName}, ${formatarchiveBHistoryDate(next.dateKey)}`;
  return {
    title: next.missedBefore ? "Remember this task" : "Task coming up soon",
    body: next.missedBefore
      ? `${next.habit.name} is coming up ${when}. This task has gone past deadline before, so set it up early instead of waiting.`
      : `${next.habit.name} is coming up ${when}. Put it on your radar now so it does not sneak up on you.`,
    tone: next.missedBefore ? "action" : "steady",
    destination: "tasks",
    actionLabel: "Go to tasks"
  };
}

function getUpcomingTaskReminderCandidates(now = new Date(), horizonDays = 5) {
  const upcoming = [];
  for (let offset = 1; offset <= horizonDays; offset += 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    const dateKey = toDateKey(date);
    const dayName = weekDays[date.getDay()];
    habits
      .filter((habit) => isTaskScheduledForDate(habit, dateKey) && !habit.completions.includes(dateKey))
      .forEach((habit) => {
        const missedBefore = taskDeadlineEvents.some((event) => event.taskId === habit.id);
        upcoming.push({ habit, dateKey, dayName, offset, missedBefore });
      });
  }

  return upcoming.sort((first, second) => {
    if (first.missedBefore !== second.missedBefore) return first.missedBefore ? -1 : 1;
    return first.offset - second.offset;
  });
}

async function loadAiCoachInsight(cacheKey, localInsights) {
  if (!isAiDictationEnabled()) return;
  if (aiCoachInsight && aiCoachCacheKey === cacheKey) return;
  if (aiCoachFailedKey === cacheKey) return;
  const requestId = aiCoachRequestId + 1;
  aiCoachRequestId = requestId;
  try {
    const insight = await fetchAiCoachInsight(localInsights);
    if (requestId !== aiCoachRequestId || !insight) return;
    aiCoachCacheKey = cacheKey;
    aiCoachInsight = insight;
    renderSmartCoach();
  } catch {
    if (requestId === aiCoachRequestId) {
      aiCoachCacheKey = cacheKey;
      aiCoachInsight = null;
      aiCoachFailedKey = cacheKey;
    }
  }
}

async function fetchAiCoachInsight(localInsights) {
  const snapshot = buildAiCoachSnapshot(localInsights);
  if (!canUseCloudAi()) return null;
  return normalizeAiCoachInsight(await fetchBackendAiCoachInsight(snapshot));
}

async function fetchBackendAiCoachInsight(snapshot) {
  const headers = { "Content-Type": "application/json" };
  if (appSettings.aiBackendToken) headers["X-App-Token"] = appSettings.aiBackendToken;
  const backendUrl = getConfiguredAiBackendUrl();
  if (!backendUrl) throw new Error("AI service is not configured.");
  const response = await fetchWithTimeout(`${backendUrl}/api/coach/analyze`, {
    method: "POST",
    headers,
    body: JSON.stringify({ snapshot })
  }, AI_COACH_TIMEOUT_MS);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 2500) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted || error?.name === "AbortError" || /aborted/i.test(error?.message || "")) {
      const timeoutSeconds = Math.round(timeoutMs / 1000);
      throw new Error(`AI request timed out after ${timeoutSeconds} seconds. If you uploaded a photo, try again or use a clearer smaller photo.`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function normalizeAiCoachInsight(data) {
  const title = cleanAiCoachText(data?.title).slice(0, 70);
  const body = cleanAiCoachText(data?.body).slice(0, 260);
  if (!title || !body) return null;
  const allowedDestinations = ["tasks", "water", "archiveC", "archiveB", "settings"];
  const destination = allowedDestinations.includes(data?.destination) ? data.destination : null;
  return {
    title,
    body,
    tone: ["steady", "action", "support", "care", "neutral"].includes(data?.tone) ? data.tone : "status",
    destination,
    actionLabel: destination ? cleanAiCoachText(data?.actionLabel || getAiCoachActionLabel(destination)) : null,
    suggestedTask: cleanAiCoachText(data?.suggestedTask || ""),
    aiGenerated: true
  };
}

function cleanAiCoachText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function truncateForAi(value, maxLength = 300) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}...` : text;
}

function getAiCoachActionLabel(destination) {
  return {
    tasks: "Go to tasks",
    water: "Go to water",
    archiveC: "Go to archiveC",
    archiveB: "Go to archiveB",
    settings: "Go to settings"
  }[destination] || "Open";
}

function getAiCoachSnapshotKey() {
  return JSON.stringify({
    tasks: habits.map((habit) => [habit.id, habit.name, getTaskDateKey(habit), getTaskDay(habit), habit.category, habit.time, habit.deadline, habit.priority, truncateForAi(habit.note, 160), habit.completions?.slice(-21)]),
    archiveA: archiveAEntries.slice(0, 21),
    archiveB: archiveBEntries.slice(0, 21).map((entry) => ({ ...entry, note: truncateForAi(entry.note, 160) })),
    deadlines: taskDeadlineEvents.slice(0, 21),
    settings: [appSettings.heightInches]
  });
}

function buildAiCoachSnapshot(localInsights) {
  const weekStats = getWeekStats();
  const weeklyTotals = getWeeklyCompletionTotals();
  const todayTasks = habits.filter((habit) => isTaskScheduledForDate(habit, today));
  const completedToday = todayTasks.filter((habit) => habit.completions.includes(today)).length;
  return {
    today,
    heightInches: Number(appSettings.heightInches) || null,
    waterGoal: getDailyWaterGoal(),
    weeklyTaskProgress: {
      average: weeklyTotals.average,
      completedTasks: weeklyTotals.totalComplete,
      totalTasks: weeklyTotals.totalTasks,
      days: weekStats.map((day) => ({ day: day.dayName, date: day.dateKey, percent: day.percent, done: day.complete, total: day.total }))
    },
    todayDashboard: {
      taskCount: todayTasks.length,
      completedTasks: completedToday,
      completionPercent: todayTasks.length ? Math.round((completedToday / todayTasks.length) * 100) : 0,
      latestarchiveC: archiveAEntries[0] || null,
      archiveBToday: archiveBEntries.filter((entry) => entry.date === today)
    },
    localInsights: localInsights.slice(0, 6).map(({ title, body, tone }) => ({ title, body, tone })),
    tasks: habits.map((habit) => ({
      id: habit.id,
      name: habit.name,
      date: getTaskDateKey(habit),
      day: getTaskDay(habit),
      category: habit.category || "",
      time: normalizeTaskTime(habit.time || ""),
      deadline: normalizeTaskTime(habit.deadline || ""),
      priority: habit.priority || "Normal",
      note: truncateForAi(habit.note, 180),
      completions: (habit.completions || []).slice(-30),
      completedRecently: (habit.completions || []).filter((dateKey) => daysBetween(dateKey, today) <= 30)
    })),
    missedDeadlines: taskDeadlineEvents.slice(0, 30),
    taskSignals: archiveAEntries.slice(0, 30).map((entry) => ({
      date: entry.date,
      valueA: entry.valueA,
      valueB: entry.valueB,
      valueC: entry.valueC,
      phasePhase: entry.phasePhase,
      valueD: entry.valueD,
      systolic: entry.systolic,
      diastolic: entry.diastolic,
      water: entry.water
    })),
    issues: archiveBEntries.slice(0, 30).map((entry) => ({
      date: entry.date,
      name: entry.name,
      severity: entry.severity,
      note: truncateForAi(entry.note, 180)
    })),
    wholeAppTrendScan: buildWholeAppTrendScan()
  };
}

function getDataTrendInsights() {
  return [
    getWholeAppTrendInsight(),
    getTaskTrendInsight(),
    getDeadlineTrendInsight(),
    getNumericTrendInsight("Water trend", archiveAEntries, "water", "oz", 12, true),
    getNumericTrendInsight("Value trend", archiveAEntries, "valueC", "lb", 10, false),
    getNumericTrendInsight("Reading trend", archiveAEntries, "valueD", "", 8, false),
    getvalueDPatternInsight(),
    getreadingTrendInsight(),
    getarchiveBTrendInsight(),
  ].filter(Boolean);
}

function buildWholeAppTrendScan() {
  const dateKeys = getRecentDateKeys(30, 0);
  return dateKeys.map((dateKey) => {
    const tasksForDay = habits.filter((habit) => isTaskScheduledForDate(habit, dateKey));
    const completeTasks = tasksForDay.filter((habit) => habit.completions.includes(dateKey)).length;
    const archiveA = archiveAEntries.find((entry) => entry.date === dateKey) || null;
    const archiveB = archiveBEntries.filter((entry) => entry.date === dateKey);
    const missedDeadlines = taskDeadlineEvents.filter((event) => event.date === dateKey);
    return {
      date: dateKey,
      taskPercent: tasksForDay.length ? Math.round((completeTasks / tasksForDay.length) * 100) : null,
      missedDeadlines: missedDeadlines.length,
      water: archiveA && Number.isFinite(archiveA.water) ? archiveA.water : null,
      valueD: archiveA && Number.isFinite(archiveA.valueD) ? archiveA.valueD : null,
      readingPressure: archiveA && Number.isFinite(archiveA.systolic) && Number.isFinite(archiveA.diastolic) ? `${archiveA.systolic}/${archiveA.diastolic}` : null,
      archiveB: archiveB.map((entry) => `${entry.severity} ${entry.name}`)
    };
  }).filter((day) => day.taskPercent !== null || day.missedDeadlines || day.water !== null || day.valueD !== null || day.readingPressure || day.archiveB.length);
}

function getfocusLogTrendFlags(text) {
  const normalized = normalizefocusLogConcernText(text);
  const flags = [];
  if (matchesAnyPattern(normalized, urgentfocusStatePatterns)) flags.push("urgent-language");
  if (matchesAnyPattern(normalized, lowFocusfocusStatePatterns)) flags.push("lowFocus-language");
  if (matchesAnyPattern(normalized, negativeThoughtPatterns) || matchesAnyPattern(normalized, focusLogConcernPatterns)) flags.push("negative-thought-pattern");
  if (matchesAnyPattern(normalized, focusLogStressPatterns)) flags.push("stress-language");
  return flags;
}

function getWholeAppTrendInsight() {
  const scan = buildWholeAppTrendScan();
  if (scan.length < 3) return null;
  const lowWaterarchiveBDays = scan.filter((day) => Number.isFinite(day.water) && day.water < getDailyWaterGoal() && day.archiveB.length);
  if (lowWaterarchiveBDays.length >= 2) {
    return {
      title: "Water and issue link",
      body: `${lowWaterarchiveBDays.length} recent days had low water plus logged issues. Log water earlier today and compare whether the day feels easier when water is steadier.`,
      tone: "support",
      destination: "water",
      actionLabel: "Go to water"
    };
  }
  return null;
}

function getLimitInsights(latestEntry, latestfocusState) {
  if (!latestEntry && !latestfocusState) return [];
  return [
    getreadingLimitInsight(latestEntry),
    getvalueDLimitInsight(latestEntry),
    getvalueALimitInsight(latestEntry),
    getvalueBLimitInsight(latestEntry),
    getvalueCLimitInsight(latestEntry)
  ].filter(Boolean);
}

function getreadingLimitInsight(entry) {
  if (!entry || !Number.isFinite(entry.systolic) || !Number.isFinite(entry.diastolic)) return null;
  const category = getreadingCategory(entry.systolic, entry.diastolic);
  if (category.level === "normal") return null;
  if (category.level === "low") {
    return {
      title: "Low pressure reading",
      body: `${formatreading(entry.systolic, entry.diastolic)} is lower than your usual signal range. Recheck calmly and use this only as personal context for planning your day.`,
      tone: "care",
      destination: "archiveC",
      actionLabel: "Go to signals"
    };
  }
  return {
    title: `${category.label} pressure signal`,
    body: `${formatreading(entry.systolic, entry.diastolic)} is outside your usual signal range. Use it as context for a calmer recheck and a smaller next task.`,
    tone: category.level === "severe" ? "care" : "support",
    destination: "archiveC",
    actionLabel: "Go to signals"
  };
}

function getvalueDLimitInsight(entry) {
  if (!entry || !Number.isFinite(entry.valueD)) return null;
  if (entry.valueD < 70) {
    const severe = entry.valueD < 54;
    return {
      title: severe ? "Very low reading" : "Low reading",
      body: `${formatWholeNumber(entry.valueD)} is lower than your usual signal range. Recheck calmly and plan the next task conservatively.`,
      tone: "care",
      destination: "archiveC",
      actionLabel: "Go to signals"
    };
  }
  if (entry.valueD <= 180) return null;
  return {
    title: "High reading",
    body: `${formatWholeNumber(entry.valueD)} is higher than your usual signal range. Note timing, water, stress, and task load if you want context later.`,
    tone: "support",
    destination: "archiveC",
    actionLabel: "Go to signals"
  };
}

function getvalueALimitInsight(entry) {
  if (!entry || !Number.isFinite(entry.valueA) || entry.valueA <= 2000) return null;
  return {
    title: "Energy entry above usual",
    body: `${formatWholeNumber(entry.valueA)} energy units is above your usual signal range. Use it as context for planning tomorrow's tasks.`,
    tone: "support",
    destination: "archiveC",
    actionLabel: "Go to signals"
  };
}

function getvalueBLimitInsight(entry) {
  if (!entry || !Number.isFinite(entry.valueB)) return null;
  if (entry.valueB < 130) {
    return {
      title: "Fuel entry below usual",
      body: `${formatWholeNumber(entry.valueB)}g fuel is below your usual signal range. Use it as context for energy and task pacing.`,
      tone: "support",
      destination: "archiveC",
      actionLabel: "Go to signals"
    };
  }
  if (entry.valueB <= 275) return null;
  return {
    title: "Fuel entry above usual",
    body: `${formatWholeNumber(entry.valueB)}g fuel is above your usual signal range. Use it as context for tomorrow's plan.`,
    tone: "support",
    destination: "archiveC",
    actionLabel: "Go to signals"
  };
}

function getvalueCLimitInsight(entry) {
  if (!entry || !Number.isFinite(entry.valueC)) return null;
  const bmi = getLatestBmi(entry.valueC);
  if (!Number.isFinite(bmi)) {
    return {
      title: "Add context for value AI",
      body: "This value needs more context to be useful. Add supporting setup details only if you want better trend notes.",
      tone: "action",
      destination: "settings",
      actionLabel: "Go to settings"
    };
  }
  const category = getBmiCategory(bmi);
  if (category.level === "balanced") return null;
  return {
    title: `${category.label} value range`,
    body: `Your latest value is outside your usual range. Use it only as a planning signal alongside sleep, water, and task load.`,
    tone: "support",
    destination: "archiveC",
    actionLabel: "Go to signals"
  };
}

function getfocusStateSupportInsight(latestfocusState) {
  if (!latestfocusState || !["Low", "Stressed", "Anxious"].includes(latestfocusState.name)) return null;
  const suggestion = getfocusStateSuggestion(latestfocusState.name);
  return {
    title: `${latestfocusState.name} focusState support`,
    body: suggestion.body,
    tone: "care",
    destination: "focusState",
    actionLabel: "Go to focusState"
  };
}

function getSafetySupportInsight() {
  const analysis = analyzefocusStateSafety();
  if (!analysis) return null;
  if (analysis.level === "urgent") {
    return {
      title: "Immediate support",
      body: "Your focusState notes include language that can match urgent-risk or urgent-risk warning signs. If you might act on those thoughts or are in urgent situation, get help now or get help if available. For task support support in the U.S., call or text support.",
      tone: "care",
      destination: "focusState",
      actionLabel: "Go to focusState"
    };
  }
  if (analysis.level === "lowFocus-pattern") {
    return {
      title: "lowFocus pattern watch",
      body: `${analysis.count} recent focusState note${analysis.count === 1 ? "" : "s"} include lowFocus warning words, and your logs are trending low. Consider contacting a qualified professional or qualified support qualified helper. If it feels urgent or hard to stay safe, get help now or get help if available. For task support support in the U.S., call or text support.`,
      tone: "care",
      destination: "focusState",
      actionLabel: "Go to focusState"
    };
  }
  return {
    title: "focusState support plan",
    body: "Recent focusState logs are stacking up on the low side. Set one small support task, tell one trusted person how you are doing, and consider professional help if this keeps repeating.",
    tone: "care",
    destination: "focusState",
    actionLabel: "Go to focusState"
  };
}

function analyzefocusStateSafety() {
  const recent = focusStateEntries
    .filter((entry) => entry.date)
    .sort((first, second) => second.date.localeCompare(first.date))
    .slice(0, 14);
  if (!recent.length) return null;
  const notes = recent.map((entry) => normalizefocusLogConcernText(entry.note || "")).filter(Boolean);
  if (notes.some((note) => matchesAnyPattern(note, urgentfocusStatePatterns))) {
    return { level: "urgent", count: 1 };
  }
  const lowFocusHits = notes.filter((note) => matchesAnyPattern(note, lowFocusfocusStatePatterns)).length;
  const lowStrongCount = recent.filter((entry) => ["Low", "Anxious", "Stressed"].includes(entry.name) && entry.intensity === "Strong").length;
  const lowfocusStateCount = recent.filter((entry) => ["Low", "Anxious", "Stressed"].includes(entry.name)).length;
  if (lowFocusHits >= 1 && (lowfocusStateCount >= 2 || lowStrongCount >= 1)) {
    return { level: "lowFocus-pattern", count: lowFocusHits };
  }
  if (lowStrongCount >= 3 || lowfocusStateCount >= 5) {
    return { level: "low-trend", count: lowfocusStateCount };
  }
  return null;
}

function matchesAnyPattern(value, patterns) {
  return patterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}

function getSignalPatternInsight() {
  return null;
}

function getRecentfocusLogText(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const parts = [];
  archiveBEntries.forEach((entry) => {
    if (parseDateKey(entry.date) >= cutoff) parts.push(entry.name, entry.severity, entry.note);
  });
  focusStateEntries.forEach((entry) => {
    if (parseDateKey(entry.date) >= cutoff) parts.push(entry.name, entry.intensity, entry.note);
  });
  focusLogEntries.forEach((entry) => {
    if (parseDateKey(entry.date) >= cutoff) parts.push(entry.text);
  });
  return parts.filter(Boolean).join(" ");
}

function countSignalMatches(value, patterns) {
  return patterns.reduce((count, pattern) => count + (pattern.test(value) ? 1 : 0), 0);
}

function getTaskTrendInsight() {
  const recentDays = getRecentDateKeys(7, 0);
  const previousDays = getRecentDateKeys(7, 7);
  const recent = getAverageTaskCompletionForDates(recentDays);
  const previous = getAverageTaskCompletionForDates(previousDays);
  if (!Number.isFinite(recent) || !Number.isFinite(previous)) return null;
  const change = Math.round(recent - previous);
  if (Math.abs(change) < 10) return null;
  return {
    title: change > 0 ? "Task trend improving" : "Task trend slipping",
    body: `Task completion is ${Math.abs(change)} points ${change > 0 ? "higher" : "lower"} than the prior week based on scheduled tasks.`,
    tone: change > 0 ? "steady" : "action",
    destination: change < 0 ? "tasks" : null,
    actionLabel: change < 0 ? "Go to tasks" : null
  };
}

function getDeadlineTrendInsight() {
  const recentEvents = taskDeadlineEvents.filter((event) => event.date >= getRecentCutoffKey(30));
  const now = new Date();
  const overdueNow = getCurrentOverdueTasks(now);
  if (overdueNow.length) {
    return {
      title: "Task deadlines slipping",
      body: `${overdueNow.length} task${overdueNow.length === 1 ? "" : "s"} are past deadline and still open. Clear or reschedule those before adding more tasks.`,
      tone: "action",
      destination: "tasks",
      actionLabel: "Go to tasks"
    };
  }
  const comingDue = getUpcomingDeadlineTasks(now);
  if (comingDue.length) {
    const next = comingDue[0];
    const hours = Math.max(1, Math.ceil((next.dueAt.getTime() - now.getTime()) / (60 * 60 * 1000)));
    return {
      title: "Task coming due",
      body: `${next.habit.name} is due in about ${hours} hour${hours === 1 ? "" : "s"}. Finish it now or move the deadline before it becomes overdue.`,
      tone: "action",
      destination: "tasks",
      actionLabel: "Go to tasks"
    };
  }
  if (recentEvents.length < 2) return null;
  return {
    title: "Deadline pattern watch",
    body: `${recentEvents.length} task deadline${recentEvents.length === 1 ? "" : "s"} went past due in the last 30 days. Shorten the task list or move deadlines earlier in the day so misses show up before night.`,
    tone: "action",
    destination: "tasks",
    actionLabel: "Go to tasks"
  };
}

function getNumericTrendInsight(title, entries, key, unit, minimumCount, higherIsBetter) {
  const values = entries
    .filter((entry) => Number.isFinite(entry[key]))
    .sort((first, second) => first.date.localeCompare(second.date));
  if (values.length < minimumCount) return null;
  const recent = getAverage(values.slice(-Math.ceil(minimumCount / 2)).map((entry) => entry[key]));
  const previous = getAverage(values.slice(-minimumCount, -Math.ceil(minimumCount / 2)).map((entry) => entry[key]));
  if (!Number.isFinite(recent) || !Number.isFinite(previous)) return null;
  const change = recent - previous;
  const threshold = key === "valueC" ? 1 : key === "water" ? 8 : key === "valueD" ? 5 : 1;
  if (Math.abs(change) < threshold) return null;
  const improved = higherIsBetter ? change > 0 : change < 0;
  return {
    title: improved ? `${title} looks better` : `${title} needs attention`,
    body: `${title.replace(" trend", "")} moved ${formatTrendAmount(change, unit)} compared with the previous logged stretch.`,
    tone: improved ? "steady" : "support",
    destination: improved ? null : key === "water" ? "water" : "archiveC",
    actionLabel: improved ? null : key === "water" ? "Go to water" : "Go to history"
  };
}

function getvalueDPatternInsight() {
  const readings = archiveAEntries
    .filter((entry) => Number.isFinite(entry.valueD))
    .sort((first, second) => first.date.localeCompare(second.date))
    .slice(-7);
  if (readings.length < 3) return null;
  const lowCount = readings.filter((entry) => entry.valueD < 70).length;
  const highCount = readings.filter((entry) => entry.valueD > 180).length;
  if (lowCount >= 2) {
    return {
      title: "Low reading pattern",
      body: `${lowCount} of your last ${readings.length} readings were below your usual range. Look for timing patterns around task load, water, sleep, or stress.`,
      tone: "care",
      destination: "archiveC",
      actionLabel: "Go to history"
    };
  }
  if (highCount >= 3) {
    return {
      title: "High reading pattern",
      body: `${highCount} of your last ${readings.length} readings were above your usual range. Check whether they cluster around stress, missed sleep, or heavier task days.`,
      tone: "support",
      destination: "archiveC",
      actionLabel: "Go to history"
    };
  }
  return null;
}

function getreadingTrendInsight() {
  const values = archiveAEntries
    .filter((entry) => Number.isFinite(entry.systolic) && Number.isFinite(entry.diastolic))
    .sort((first, second) => first.date.localeCompare(second.date));
  if (values.length < 8) return null;
  const recent = values.slice(-4);
  const previous = values.slice(-8, -4);
  const recentSys = getAverage(recent.map((entry) => entry.systolic));
  const previousSys = getAverage(previous.map((entry) => entry.systolic));
  const recentDia = getAverage(recent.map((entry) => entry.diastolic));
  const previousDia = getAverage(previous.map((entry) => entry.diastolic));
  const sysChange = recentSys - previousSys;
  const diaChange = recentDia - previousDia;
  if (Math.abs(sysChange) < 5 && Math.abs(diaChange) < 3) return null;
  const improved = sysChange < 0 && diaChange <= 1;
  return {
    title: improved ? "Pressure reading trending down" : "Pressure reading trending up",
    body: `Recent average moved ${formatTrendAmount(sysChange, "first value")} and ${formatTrendAmount(diaChange, "second value")} compared with the prior readings.`,
    tone: improved ? "steady" : "support"
  };
}

function getfocusStateTrendInsight() {
  const scores = focusStateEntries
    .map((entry) => ({ date: entry.date, score: getfocusStateScore(entry.name) }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((first, second) => first.date.localeCompare(second.date));
  if (scores.length < 6) return null;
  const recent = getAverage(scores.slice(-3).map((entry) => entry.score));
  const previous = getAverage(scores.slice(-6, -3).map((entry) => entry.score));
  const change = recent - previous;
  if (Math.abs(change) < 0.75) return null;
  return {
    title: change > 0 ? "focusState trend improving" : "focusState trend declining",
    body: `Recent focusState logs are averaging ${change > 0 ? "better" : "lower"} than the previous few entries.`,
    tone: change > 0 ? "steady" : "care",
    destination: change < 0 ? "focusState" : null,
    actionLabel: change < 0 ? "Go to focusState" : null
  };
}

function getarchiveBTrendInsight() {
  const recentCount = getEntryCountInLastDays(archiveBEntries, 7, 0);
  const previousCount = getEntryCountInLastDays(archiveBEntries, 7, 7);
  if (recentCount + previousCount < 3 || recentCount === previousCount) return null;
  return {
    title: recentCount < previousCount ? "archiveB easing" : "archiveB increasing",
    body: `You logged ${recentCount} archiveB this week versus ${previousCount} the week before.`,
    tone: recentCount < previousCount ? "steady" : "care",
    destination: recentCount > previousCount ? "archiveB" : null,
    actionLabel: recentCount > previousCount ? "Go to archiveB" : null
  };
}

function getfocusLogPatternInsight() {
  const recent = focusLogEntries
    .filter((entry) => entry.date >= getRecentCutoffKey(30))
    .sort((first, second) => second.date.localeCompare(first.date));
  if (!recent.length) return null;
  const urgentEntry = recent.find((entry) => hasurgentLanguage(entry.text));
  if (urgentEntry) {
    return {
      title: "focusLog safety concern",
      body: "A focusLog entry includes language that can match urgent-risk or urgent-risk warning signs. If there is urgent situation, get help now or get help if available. For task support support in the U.S., call or text support.",
      tone: "care",
      destination: "focusLog",
      actionLabel: "Go to focusLog"
    };
  }
  const lowFocusHits = recent.filter((entry) => matchesAnyPattern(normalizefocusLogConcernText(entry.text), lowFocusfocusStatePatterns));
  if (lowFocusHits.length >= 1) {
    return {
      title: "focusLog focusState pattern",
      body: `${lowFocusHits.length} recent focusLog entr${lowFocusHits.length === 1 ? "y uses" : "ies use"} lowFocus warning language. Do one immediate support step: lower today's task load, tell one trusted person, and consider professional support if this keeps showing up.`,
      tone: "care",
      destination: "focusLog",
      actionLabel: "Go to focusLog"
    };
  }
  const thoughtHits = recent.filter((entry) => {
    const normalized = normalizefocusLogConcernText(entry.text);
    return matchesAnyPattern(normalized, negativeThoughtPatterns) || matchesAnyPattern(normalized, focusLogConcernPatterns);
  });
  if (thoughtHits.length >= 1) {
    return {
      title: "Thought pattern watch",
      body: `${thoughtHits.length} recent focusLog entries show repeated negative thought patterns like all-or-nothing thinking, self-blame, or worst-case spiraling. Write one balanced counterpoint, then choose one small action you can control today.`,
      tone: "care",
      destination: "focusLog",
      actionLabel: "Go to focusLog"
    };
  }
  const linkedPattern = getfocusLogLinkedPattern(recent);
  if (linkedPattern) return linkedPattern;
  const stressHits = recent.filter((entry) => matchesAnyPattern(normalizefocusLogConcernText(entry.text), focusLogStressPatterns));
  if (stressHits.length >= 1) {
    return {
      title: "focusLog stress pattern",
      body: `${stressHits.length} recent focusLog entries mention stress or anxiety. Reduce the next task list, add a short reset task, and check whether water, readings, pressure, or issues changed on the same dates.`,
      tone: "care",
      destination: "focusLog",
      actionLabel: "Go to focusLog"
    };
  }
  return null;
}

function getLatestfocusLogEntryInsight() {
  const todayEntries = focusLogEntries.filter((entry) => entry.date === today && entry.text);
  if (!todayEntries.length) return null;
  const urgentEntry = todayEntries.find((entry) => hasurgentLanguage(entry.text));
  if (urgentEntry) {
    return {
      title: "focusLog safety concern",
      body: "Today's focusLog entry includes language that can match urgent-risk or urgent-risk warning signs. If you might act on those thoughts or are in urgent situation, get help now or get help if available. For task support support in the U.S., call or text support.",
      tone: "care",
      destination: "focusLog",
      actionLabel: "Go to focusLog"
    };
  }
  const lowFocusEntry = todayEntries.find((entry) => matchesAnyPattern(normalizefocusLogConcernText(entry.text), lowFocusfocusStatePatterns));
  if (lowFocusEntry) {
    return {
      title: "Support from today's focusLog",
      body: "Today's focusLog entry sounds heavy. Keep the next task small, drink water, pause before adding more obligations, and reach out to a trusted person or qualified helper if this feeling is sticking around.",
      tone: "care",
      destination: "focusLog",
      actionLabel: "Go to focusLog"
    };
  }
  const thoughtEntry = todayEntries.find((entry) => {
    const normalized = normalizefocusLogConcernText(entry.text);
    return matchesAnyPattern(normalized, negativeThoughtPatterns) || matchesAnyPattern(normalized, focusLogConcernPatterns);
  });
  if (thoughtEntry) {
    return {
      title: "Thought pattern in focusLog",
      body: "Today's focusLog entry has signs of self-blame, worst-case thinking, or all-or-nothing language. Write one balanced counterpoint, then choose one small action you can control in the next 10 minutes.",
      tone: "care",
      destination: "focusLog",
      actionLabel: "Go to focusLog"
    };
  }
  const stressEntry = todayEntries.find((entry) => matchesAnyPattern(normalizefocusLogConcernText(entry.text), focusLogStressPatterns));
  if (stressEntry) {
    return {
      title: "Stress signal in focusLog",
      body: "Today's focusLog entry points to stress. Make the app work for that: reduce the task list, log focusState and archiveB, and use the next task as a reset instead of another demand.",
      tone: "care",
      destination: "focusLog",
      actionLabel: "Go to focusLog"
    };
  }
  return null;
}

function hasurgentLanguage(text) {
  const normalized = normalizefocusLogConcernText(text);
  return matchesAnyPattern(normalized, urgentfocusStatePatterns) || (
    /\b(i'?m|i am|im|feel|feeling)\b/.test(normalized) &&
    matchesAnyPattern(normalized, focusLogConcernPatterns) &&
    matchesAnyPattern(normalized, lowFocusfocusStatePatterns)
  );
}

function handleImmediatefocusLogSafetySignal(text) {
  if (!hasurgentLanguage(text)) return;
  const body = "AI Coach noticed a serious focusLog safety warning. If you might feel unsafe or are in danger, get help now, get help if available, call or text support for task support support, or call a trusted friend.";
  sendAppNotification("AI Coach safety alert", body, `focusArea:focusLog-urgent:${Date.now()}`);
  window.alert(body);
}

async function scanfocusLogAndAppWithAiForSafety(latestfocusLogText = "") {
  if (!canUseCloudAi()) return;
  const requestId = aiSafetyScanRequestId + 1;
  aiSafetyScanRequestId = requestId;
  try {
    const result = await fetchAiSafetyScan(buildAiSafetyScanSnapshot(latestfocusLogText));
    if (requestId !== aiSafetyScanRequestId || !result) return;
    handleAiSafetyScanResult(result);
  } catch (error) {
    console.warn("AI safety scan failed.", error);
  }
}

function buildAiSafetyScanSnapshot(latestfocusLogText = "") {
  return {
    scanReason: "focusLog_saved",
    latestfocusLogText: truncateForAi(latestfocusLogText, 1200),
    focusLogEntries: focusLogEntries.map((entry) => ({
      date: entry.date,
      text: truncateForAi(entry.text, 700)
    })).slice(0, 40),
    focusStateEntries: focusStateEntries.map((entry) => ({
      date: entry.date,
      focusState: entry.name,
      intensity: entry.intensity,
      note: truncateForAi(entry.note, 300)
    })).slice(0, 60),
    archiveBEntries: archiveBEntries.map((entry) => ({
      date: entry.date,
      archiveB: entry.name,
      severity: entry.severity,
      note: truncateForAi(entry.note, 300)
    })).slice(0, 60),
    localTrendFlags: buildWholeAppTrendScan()
  };
}

async function fetchAiSafetyScan(snapshot) {
  if (!canUseCloudAi()) return null;
  const headers = { "Content-Type": "application/json" };
  if (appSettings.aiBackendToken) headers["X-App-Token"] = appSettings.aiBackendToken;
  const backendUrl = getConfiguredAiBackendUrl();
  if (!backendUrl) return null;
  const response = await fetchWithTimeout(`${backendUrl}/api/safety/scan`, {
    method: "POST",
    headers,
    body: JSON.stringify({ snapshot })
  }, AI_SAFETY_SCAN_TIMEOUT_MS);
  if (!response.ok) throw new Error(await getFriendlyAiError(response, "AI safety scan"));
  return normalizeAiSafetyScanResult(await response.json());
}

function normalizeAiSafetyScanResult(data) {
  const level = ["none", "concern", "urgent"].includes(data?.level) ? data.level : "none";
  return {
    level,
    matchedText: cleanAiCoachText(data?.matchedText || "").slice(0, 180),
    reason: cleanAiCoachText(data?.reason || "").slice(0, 220),
    action: cleanAiCoachText(data?.action || "").slice(0, 180)
  };
}

function handleAiSafetyScanResult(result) {
  if (result.level === "urgent") {
    const body = `OpenAI safety scan flagged a serious focusLog warning${result.reason ? `: ${result.reason}` : "."} If you might feel unsafe or are in danger, get help now, get help if available, call or text support for task support support, or call a trusted friend.`;
    sendAppNotification("AI Coach safety alert", body, `focusArea:focusLog-ai-urgent:${Date.now()}`);
    window.alert(body);
    scheduleSmartCoachRender();
    return;
  }
  if (result.level === "concern") {
    sendAppNotification(
      "AI Coach check-in",
      `OpenAI safety scan noticed concerning focusLog or focusState language${result.reason ? `: ${result.reason}` : "."} Is there anything that can be done to help right now?`,
      `focusArea:focusLog-ai-concern:${Date.now()}`
    );
    scheduleSmartCoachRender();
  }
}

function normalizefocusLogConcernText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\bmy\s+self\b/g, "myself")
    .replace(/\bmy(?:s[e3]l[fv]|s[e3]kf|slef|sefl|selfe|selff|sekf|slekf|slefk)\b/g, "myself")
    .replace(/\bkil+\b|\bkilll\b/g, "kill")
    .replace(/\bk1ll\b|\bk!ll\b/g, "kill")
    .replace(/\bki[l1]l\s+myself\b/g, "kill myself")
    .replace(/\bkms\b/g, "kill myself")
    .replace(/\bkys\b/g, "kill yourself")
    .replace(/\bsui(?:cide|cidal|side|c1de|c!de)?\b/g, "urgent-risk")
    .replace(/\bunaliv(?:e|ing)?\s*(?:myself|me)?\b/g, "kill myself")
    .replace(/\bun alive\s+(?:myself|me)\b/g, "kill myself")
    .replace(/\boff\s+myself\b/g, "kill myself")
    .replace(/\bdelete\s+(?:myself|me)\b/g, "kill myself")
    .replace(/\bself\s+delete\b/g, "kill myself")
    .replace(/\bnot\s+wake\s+up\b/g, "not wake up")
    .replace(/\bselfharm\b/g, "urgent-risk")
    .replace(/\bdeprest\b|\bdepresed\b|\bdeppressed\b|\bdepresd\b/g, "low")
    .replace(/\bhopless\b|\bhope less\b|\bhoepeless\b/g, "hopeless")
    .replace(/\bworthles\b|\bworthlesss\b/g, "worthless")
    .replace(/\bbeter\b/g, "better")
    .replace(/\boverwhelmd\b|\boverwhealmed\b|\boverwhelmedd\b/g, "overwhelmed")
    .replace(/\banx(?:y|ie|ious)?\b/g, "anxious")
    .replace(/\bpanicing\b|\bpanick(?:ing|ed)?\b/g, "panic")
    .replace(/\bcant\b/g, "can't")
    .replace(/\bdont\b/g, "don't")
    .replace(/\bim\b/g, "i'm")
    .replace(/\s+/g, " ")
    .trim();
}

function getfocusLogLinkedPattern(entries) {
  const linked = entries.map((entry) => {
    const archiveBCount = archiveBEntries.filter((archiveB) => archiveB.date === entry.date).length;
    const focusState = focusStateEntries.find((item) => item.date === entry.date);
    const archiveC = archiveAEntries.find((item) => item.date === entry.date);
    const hasarchiveCFlag = Boolean(archiveC && (
      getreadingCategory(archiveC.systolic, archiveC.diastolic).level !== "normal" ||
      (Number.isFinite(archiveC.valueD) && (archiveC.valueD < 70 || archiveC.valueD > 180)) ||
      (Number.isFinite(archiveC.water) && archiveC.water < getDailyWaterGoal())
    ));
    const hasLowfocusState = focusState && ["Low", "Stressed", "Anxious"].includes(focusState.name);
    return { entry, archiveBCount, hasarchiveCFlag, hasLowfocusState };
  });
  const issueDays = linked.filter((item) => item.archiveBCount || item.hasarchiveCFlag || item.hasLowfocusState);
  if (issueDays.length < 2) return null;
  const archiveBDays = issueDays.filter((item) => item.archiveBCount).length;
  const archiveCDays = issueDays.filter((item) => item.hasarchiveCFlag).length;
  const focusStateDays = issueDays.filter((item) => item.hasLowfocusState).length;
  const parts = [
    archiveBDays ? `${archiveBDays} archiveB day${archiveBDays === 1 ? "" : "s"}` : "",
    archiveCDays ? `${archiveCDays} archiveC flag${archiveCDays === 1 ? "" : "s"}` : "",
    focusStateDays ? `${focusStateDays} low focusState day${focusStateDays === 1 ? "" : "s"}` : ""
  ].filter(Boolean).join(", ");
  return {
    title: "focusLog pattern link",
    body: `Recent focusLog dates overlap with ${parts}. Look at what you wrote on those days, then adjust one controllable factor: water, food timing, task load, sleep, or stress recovery.`,
    tone: "support",
    destination: "focusLog",
    actionLabel: "Go to focusLog"
  };
}

function getRecentDateKeys(count, offsetDays) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - offsetDays - (count - 1 - index));
    return toDateKey(date);
  });
}

function getAverageTaskCompletionForDates(dateKeys) {
  const percentages = dateKeys.map(getTaskCompletionPercent).filter(Number.isFinite);
  return percentages.length ? getAverage(percentages) : null;
}

function formatTrendAmount(value, unit) {
  const amount = Math.abs(value) >= 10 ? Math.round(Math.abs(value)) : Math.abs(value).toFixed(1);
  return `${value >= 0 ? "up" : "down"} ${amount} ${unit}`;
}

function getfocusStateScore(focusState) {
  return {
    Great: 5,
    Good: 4,
    Okay: 3,
    Low: 2,
    Stressed: 2,
    Anxious: 2
  }[focusState] || null;
}

function getfocusStateSuggestion(focusState) {
  const suggestions = {
    Low: {
      body: "TaskLens and NIMH guidance points toward small physical activity, social connection, water, sleep priority, and naming feelings. Start with a 10-minute walk or a check-in text.",
      task: "Take a 10 minute walk"
    },
    Stressed: {
      body: "Stress support guidance emphasizes relaxation, focusLog, movement, sleep, and setting priorities. Try a short breathing reset, then write down the next one thing.",
      task: "Two minute breathing reset"
    },
    Anxious: {
      body: "For anxious focusState, use a grounding routine: slow breathing, light movement, less caffeine, and one supportive contact. Keep the next task small and specific.",
      task: "Ground and breathe"
    }
  };
  return suggestions[focusState] || {
    body: "focusState support works best with small basics: move a little, drink water, protect sleep, write what you feel, and connect with someone supportive.",
    task: "focusState reset"
  };
}

function getreadingCategory(systolic, diastolic) {
  if (systolic <= 90 || diastolic <= 60) return { label: "Low", level: "low" };
  if (systolic > 180 || diastolic > 120) return { label: "Severe", level: "severe" };
  if (systolic >= 140 || diastolic >= 90) return { label: "Stage 2", level: "stage2" };
  if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) return { label: "Stage 1", level: "stage1" };
  if (systolic >= 120 && systolic <= 129 && diastolic < 80) return { label: "Elevated", level: "elevated" };
  return { label: "Normal", level: "normal" };
}

function getLatestBmi(valueCPounds) {
  const inches = Number(appSettings.heightInches) || 0;
  if (!Number.isFinite(valueCPounds) || inches <= 0) return null;
  return (valueCPounds / (inches * inches)) * 703;
}

function getDailyWaterGoal() {
  const latestvalueCEntry = archiveAEntries.find((entry) => Number.isFinite(entry.valueC));
  const latestvalueCPounds = latestvalueCEntry ? latestvalueCEntry.valueC : null;
  const bmi = Number.isFinite(latestvalueCPounds) ? getLatestBmi(latestvalueCPounds) : null;
  let goal = DEFAULT_WATER_GOAL_OZ;

  if (Number.isFinite(latestvalueCPounds)) {
    if (latestvalueCPounds < 105) goal = 64;
    else if (latestvalueCPounds < 130) goal = 72;
    else goal = Math.min(MAX_WATER_GOAL_OZ, Math.max(goal, Math.round((latestvalueCPounds * 0.5) / WATER_GLASS_OZ) * WATER_GLASS_OZ));
  }

  if (Number.isFinite(bmi) && bmi < 18.5) {
    goal = Math.min(goal, 72);
  }

  const recentarchiveB = archiveBEntries
    .filter((entry) => daysBetween(entry.date, today) <= 3)
    .map((entry) => `${entry.name || ""} ${entry.note || ""}`)
    .join(" ");
  if (/\b(fever|discomfort|vomit|vomiting|sweat|sweating|heat|dehydrated|lowWater)\b/i.test(recentarchiveB)) {
    goal += WATER_GLASS_OZ;
  }

  return Math.max(MIN_WATER_GOAL_OZ, Math.min(MAX_WATER_GOAL_OZ, Math.round(goal / WATER_GLASS_OZ) * WATER_GLASS_OZ));
}

function getBmiCategory(bmi) {
  if (bmi < 18.5) return { label: "UndervalueC", level: "undervalueC" };
  if (bmi < 25) return { label: "Balanced valueC", level: "balanced" };
  if (bmi < 30) return { label: "OvervalueC", level: "overvalueC" };
  return { label: "Obesity", level: "obesity" };
}

function getEntryCountInLastDays(entries, days, offsetDays) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - offsetDays - days + 1);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() - offsetDays);
  return entries.filter((entry) => {
    const date = parseDateKey(entry.date);
    return date >= start && date <= end;
  }).length;
}

function addSuggestedTask(name) {
  const duplicate = habits.some((habit) => habit.name.toLowerCase() === name.toLowerCase() && isTaskScheduledForDate(habit, today));
  if (duplicate) return;
  habits = [createTaskDraft({
    name,
    category: "General",
    priority: "Next",
    size: "Small",
    note: "Suggested by AI Coach"
  }), ...habits];
  saveHabits();
  render();
}

function togglevalueCUnit() {
  const currentvalueC = parsearchiveANumber(valueC.value);
  if (!Number.isFinite(currentvalueC)) {
    valueC.focus();
    return;
  }

  if (valueCUnit === "lb") {
    valueC.value = formatInputDecimal(currentvalueC / 2.2046226218);
    valueCUnit = "kg";
  } else {
    valueC.value = formatInputDecimal(currentvalueC * 2.2046226218);
    valueCUnit = "lb";
  }

  updatevalueCConvertButton();
  valueC.focus();
  valueC.select();
}

function updatevalueCConvertButton() {
  convertvalueC.textContent = valueCUnit === "lb" ? "lbs to kgs" : "kgs to lbs";
  if (valueCUnitLabel) {
    valueCUnitLabel.textContent = valueCUnit === "lb" ? "Value (lbs)" : "Value (kgs)";
  }
}

function getvalueCInPoundsForSave() {
  const currentvalueC = parsearchiveANumber(valueC.value);
  if (!Number.isFinite(currentvalueC)) return null;
  return valueCUnit === "kg" ? currentvalueC * 2.2046226218 : currentvalueC;
}

function jumpFromDashboard(target) {
  if (["archiveC", "water", "focusState", "archiveB"].includes(target)) {
    setfocusAreaModule(target);
  }
  if (target === "water") {
    setWaterExpanded(true);
  }
  const targets = {
    ai: document.querySelector("#smartCoachSection"),
    dashboard: document.querySelector(".today-dashboard"),
    tasks: document.querySelector("#todayTasksSection") || habitForm,
    weekly: weeklyTaskPercentBar,
    water: document.querySelector("#waterControl"),
    archiveC: archiveAPanel,
    focusState: focusStatePanel,
    archiveB: archiveBPanel,
    focusLog: focusLogPanel,
    settings: document.querySelector("#settingsButton")
  };
  const destination = targets[target];
  if (!destination) return;
  destination.scrollIntoView({ behavior: "smooth", block: "start" });

  const focusTarget = destination.matches(".day-section")
    ? destination.querySelector(".day-section-header")
    : destination.querySelector("input, select, button, textarea") || destination;
  if (focusTarget && typeof focusTarget.focus === "function") {
    window.setTimeout(() => focusTarget.focus({ preventScroll: true }), 250);
  }
}

function reviewToday() {
  const reviewItems = getReviewTodayItems();
  reviewTodayList.textContent = "";
  reviewItems.forEach((item) => {
    const row = document.createElement("button");
    const status = document.createElement("span");
    const text = document.createElement("strong");
    const detail = document.createElement("small");
    row.type = "button";
    row.className = "review-today-row";
    row.classList.toggle("complete", item.complete);
    row.setAttribute("aria-label", `${item.title}: ${item.detail}`);
    status.textContent = item.complete ? "✓" : "!";
    text.textContent = item.title;
    detail.textContent = item.detail;
    row.append(status, text, detail);
    row.addEventListener("click", () => {
      reviewTodayModal.hidden = true;
      jumpFromDashboard(item.destination);
    });
    reviewTodayList.appendChild(row);
  });
  reviewTodayModal.hidden = false;
}

function openReminderCenter() {
  const items = getReminderCenterItems();
  reminderCenterList.textContent = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "archiveA-empty";
    empty.textContent = "No open reminders right now.";
    reminderCenterList.appendChild(empty);
  }
  items.forEach((item) => {
    const row = document.createElement("button");
    const status = document.createElement("span");
    const text = document.createElement("strong");
    const detail = document.createElement("small");
    row.type = "button";
    row.className = "review-today-row reminder-center-row";
    row.classList.toggle("complete", item.tone === "steady");
    status.textContent = item.marker;
    text.textContent = item.title;
    detail.textContent = item.detail;
    row.append(status, text, detail);
    row.addEventListener("click", () => {
      reminderCenterModal.hidden = true;
      jumpFromDashboard(item.destination || "tasks");
    });
    reminderCenterList.appendChild(row);
  });
  reminderCenterModal.hidden = false;
}

function getReminderCenterItems() {
  const now = new Date();
  const todayTasks = habits.filter((habit) => isTaskScheduledForDate(habit, today));
  const openTodayTasks = todayTasks.filter((habit) => !habit.completions.includes(today));
  const overdue = getCurrentOverdueTasks(now);
  const upcomingDeadlines = getUpcomingDeadlineTasks(now);
  const upcomingTasks = getUpcomingTaskReminderCandidates(now, 5).slice(0, 4);
  const items = [];

  overdue.slice(0, 4).forEach((occurrence) => {
    items.push({
      marker: "!",
      title: occurrence.habit.name,
      detail: `Past its ${formatTaskTime(occurrence.habit.deadline)} deadline`,
      destination: "tasks"
    });
  });

  upcomingDeadlines.slice(0, 4).forEach((occurrence) => {
    const dueDate = occurrence.dateKey === today ? "today" : formatarchiveBHistoryDate(occurrence.dateKey);
    items.push({
      marker: "24",
      title: occurrence.habit.name,
      detail: `Due ${formatTaskTime(occurrence.habit.deadline)} ${dueDate}`,
      destination: "tasks",
      tone: "steady"
    });
  });

  if (openTodayTasks.length) {
    items.push({
      marker: String(openTodayTasks.length),
      title: "Open today",
      detail: `${openTodayTasks.length} task${openTodayTasks.length === 1 ? "" : "s"} left today`,
      destination: "tasks"
    });
  }

  upcomingTasks.forEach((item) => {
    const when = item.offset === 1 ? "tomorrow" : `${item.dayName}, ${formatarchiveBHistoryDate(item.dateKey)}`;
    items.push({
      marker: item.missedBefore ? "!" : "-",
      title: item.habit.name,
      detail: item.missedBefore ? `Coming ${when}, missed before` : `Coming ${when}`,
      destination: "tasks",
      tone: item.missedBefore ? "warn" : "steady"
    });
  });

  return items.slice(0, 10);
}

function triggerHapticFeedback(strength = "light") {
  const now = Date.now();
  if (now - lastHapticAt < 55) return;
  lastHapticAt = now;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  const pattern = strength === "medium" ? 14 : strength === "success" ? [8, 32, 12] : 8;
  navigator.vibrate(pattern);
}

function getHapticElement(target) {
  if (!target || typeof target.closest !== "function") return null;
  return target.closest("button, [role='button'], [role='tab'], summary, select, input[type='checkbox'], input[type='radio'], input[type='range'], .day-section-header");
}

function installHapticFeedback() {
  document.addEventListener("pointerup", (event) => {
    if (event.pointerType === "mouse") return;
    const element = getHapticElement(event.target);
    if (!element || element.disabled || element.getAttribute("aria-disabled") === "true") return;
    const strength = element.matches(".primary-button, .check-button, input[type='range']") ? "medium" : "light";
    triggerHapticFeedback(strength);
  }, { capture: true, passive: true });

  document.addEventListener("change", (event) => {
    const element = getHapticElement(event.target);
    if (!element) return;
    triggerHapticFeedback("light");
  }, { capture: true });

  document.addEventListener("submit", () => {
    triggerHapticFeedback("success");
  }, { capture: true });
}

function showToast(message) {
  if (!appToast) return;
  appToast.textContent = message;
  appToast.hidden = false;
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    appToast.hidden = true;
  }, 1800);
}

function getReviewTodayItems() {
  const summary = getTodaySummary();
  const todayTasks = summary.tasks;
  const incompleteTasks = summary.incompleteTasks;
  return [
    {
      title: "Tasks",
      detail: todayTasks.length ? (incompleteTasks.length ? `${incompleteTasks.length} still open` : "Complete") : "Not logged",
      complete: !incompleteTasks.length && todayTasks.length > 0,
      destination: "tasks"
    }
  ];
}

function hasarchiveCData(entry) {
  return Boolean(entry) && [
    entry.valueA,
    entry.valueB,
    entry.valueC,
    entry.valueD,
    entry.systolic,
    entry.diastolic
  ].some(Number.isFinite);
}

function setOverviewModule(moduleName) {
  const selectedModule = overviewModules.includes(moduleName) ? moduleName : "coach";
  overviewPanels.forEach((panel) => {
    panel.hidden = panel.dataset.overviewPanel !== selectedModule;
  });
  overviewTabs.forEach((tab) => {
    const isSelected = tab.dataset.overviewModule === selectedModule;
    tab.setAttribute("aria-selected", String(isSelected));
    if (isSelected) tab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  });
}

function handleOverviewSwipe(deltaX) {
  if (Math.abs(deltaX) < 48) return;
  const currentModule = Array.from(overviewTabs).find((tab) => tab.getAttribute("aria-selected") === "true")?.dataset.overviewModule || "coach";
  const currentIndex = overviewModules.indexOf(currentModule);
  const direction = deltaX < 0 ? 1 : -1;
  const nextIndex = Math.max(0, Math.min(overviewModules.length - 1, currentIndex + direction));
  if (nextIndex !== currentIndex) {
    setOverviewModule(overviewModules[nextIndex]);
  }
}

function setfocusAreaModule(moduleName) {
  const selectedModule = focusAreaModules.includes(moduleName) ? moduleName : "archiveC";
  const panels = {
    archiveC: archiveAPanel,
    charts: chartsPanel,
    archiveB: archiveBPanel
  };
  Object.entries(panels).forEach(([name, panel]) => {
    if (!panel) return;
    panel.hidden = name !== selectedModule;
  });
  focusAreaTabs.forEach((tab) => {
    const isSelected = tab.dataset.focusAreaModule === selectedModule;
    tab.setAttribute("aria-selected", String(isSelected));
    if (isSelected) tab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  });
  if (selectedModule === "charts") {
    archiveCHistoryDropdown.open = true;
    syncHistoryControls();
    renderHistory();
  }
}

function handlefocusAreaSwipe(deltaX) {
  if (Math.abs(deltaX) < 48) return;
  const currentModule = Array.from(focusAreaTabs).find((tab) => tab.getAttribute("aria-selected") === "true")?.dataset.focusAreaModule || "archiveC";
  const currentIndex = focusAreaModules.indexOf(currentModule);
  const direction = deltaX < 0 ? 1 : -1;
  const nextIndex = Math.max(0, Math.min(focusAreaModules.length - 1, currentIndex + direction));
  if (nextIndex !== currentIndex) {
    setfocusAreaModule(focusAreaModules[nextIndex]);
  }
}

function bindfocusAreaSwipeTarget(target) {
  target?.addEventListener("touchstart", (event) => {
    focusAreaSwipeStartX = event.touches[0]?.clientX || 0;
    focusAreaSwipeStartY = event.touches[0]?.clientY || 0;
  }, { passive: true });
  target?.addEventListener("touchend", (event) => {
    const touch = event.changedTouches[0];
    const deltaX = (touch?.clientX || focusAreaSwipeStartX) - focusAreaSwipeStartX;
    const deltaY = (touch?.clientY || focusAreaSwipeStartY) - focusAreaSwipeStartY;
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;
    handlefocusAreaSwipe(deltaX);
  });
}

function renderarchiveB() {
  if (!archiveBList || !archiveBEmpty) return;
  archiveBList.textContent = "";
  archiveBEmpty.hidden = archiveBEntries.length > 0;
  archiveBEntries.slice(0, 8).forEach((entry) => {
    const item = document.createElement("article");
    const text = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    const close = document.createElement("button");
    item.className = "archiveB-item";
    item.dataset.level = entry.severity;
    title.textContent = entry.name;
    meta.textContent = [formatEntryDate(entry.date), entry.severity, entry.note].filter(Boolean).join(" / ");
    close.className = "delete-button";
    close.type = "button";
    close.setAttribute("aria-label", `Delete ${entry.name}`);
    close.textContent = "x";
    close.addEventListener("click", () => deletearchiveB(entry.id));
    text.append(title, meta);
    item.append(text, close);
    archiveBList.appendChild(item);
  });
}

function renderarchiveBHistory() {
  if (!archiveBHistoryRows || !archiveBHistoryEmpty) return;
  const historyEntries = getarchiveBHistoryEntries();
  archiveBHistoryRows.textContent = "";
  archiveBHistoryEmpty.hidden = historyEntries.length > 0;

  historyEntries.forEach((entry) => {
    const row = document.createElement("tr");
    [formatarchiveBHistoryDate(entry.date), entry.name, entry.severity, entry.note || "--"].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    archiveBHistoryRows.appendChild(row);
  });
}

function deletearchiveB(id) {
  archiveBEntries = archiveBEntries.filter((entry) => entry.id !== id);
  savearchiveBEntries();
  renderarchiveB();
  renderarchiveBHistory();
}

function renderfocusStates() {
  if (!focusStateList || !focusStateEmpty) return;
  focusStateList.textContent = "";
  focusStateEmpty.hidden = focusStateEntries.length > 0;
  focusStateEntries.slice(0, 8).forEach((entry) => {
    const item = document.createElement("article");
    const text = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    const close = document.createElement("button");
    item.className = "archiveB-item focusState-item";
    item.dataset.level = entry.intensity;
    title.textContent = entry.name;
    meta.textContent = [formatEntryDate(entry.date), entry.intensity, entry.note].filter(Boolean).join(" / ");
    close.className = "delete-button";
    close.type = "button";
    close.setAttribute("aria-label", `Delete ${entry.name}`);
    close.textContent = "x";
    close.addEventListener("click", () => deletefocusState(entry.id));
    text.append(title, meta);
    item.append(text, close);
    focusStateList.appendChild(item);
  });
}

function renderfocusStateHistory() {
  if (!focusStateHistoryRows || !focusStateHistoryEmpty) return;
  const historyEntries = getfocusStateHistoryEntries();
  focusStateHistoryRows.textContent = "";
  focusStateHistoryEmpty.hidden = historyEntries.length > 0;

  historyEntries.forEach((entry) => {
    const row = document.createElement("tr");
    [formatarchiveBHistoryDate(entry.date), entry.name, entry.intensity, entry.note || "--"].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    focusStateHistoryRows.appendChild(row);
  });
}

function deletefocusState(id) {
  focusStateEntries = focusStateEntries.filter((entry) => entry.id !== id);
  savefocusStateEntries();
  renderfocusStates();
  renderfocusStateHistory();
}

function renderfocusLog() {
  focusLogEntries = loadfocusLogEntries();
  updatefocusLogLogButton();
}

function updatefocusLogLogButton() {
  if (!focusLogLogLink) return;
  focusLogLogLink.textContent = `focusLog Log (${focusLogEntries.length})`;
}

function openfocusLogLogList() {
  focusLogEntries = loadfocusLogEntries();
  const modal = document.createElement("section");
  const panel = document.createElement("div");
  const heading = document.createElement("div");
  const titleWrap = document.createElement("div");
  const title = document.createElement("h2");
  const actions = document.createElement("div");
  const deleteAllButton = document.createElement("button");
  const closeButton = document.createElement("button");
  const logControls = document.createElement("div");
  const list = document.createElement("div");

  modal.className = "history-modal focusLog-log-modal";
  modal.setAttribute("aria-labelledby", "focusLogLogDialogTitle");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("role", "dialog");
  panel.className = "history-panel focusLog-log-panel";
  heading.className = "section-heading";
  title.id = "focusLogLogDialogTitle";
  title.textContent = "focusLog Log";
  actions.className = "focusLog-log-actions";
  deleteAllButton.className = "text-button danger-action focusLog-delete-all-button";
  deleteAllButton.type = "button";
  deleteAllButton.textContent = "Delete all";
  deleteAllButton.disabled = focusLogEntries.length === 0;
  closeButton.className = "delete-button";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close focusLog log");
  closeButton.textContent = "x";
  logControls.className = "focusLog-log-controls";
  list.className = "archiveB-list focusLog-log-list";

  buildfocusLogLogList(list, (entry, label) => openfocusLogEntryDialog(entry, label, modal));
  titleWrap.append(title);
  actions.append(closeButton);
  heading.append(titleWrap, actions);
  logControls.append(deleteAllButton);
  panel.append(heading, logControls, list);
  modal.appendChild(panel);
  document.body.appendChild(modal);

  const close = () => modal.remove();
  deleteAllButton.addEventListener("click", () => {
    if (!window.confirm("Are you sure you want to delete all focusLog entries? This cannot be undone.")) return;
    if (!window.confirm("Are you absolutely sure? This permanently deletes every focusLog entry.")) return;
    deleteAllfocusLogEntries();
    list.textContent = "";
    buildfocusLogLogList(list, (entry, label) => openfocusLogEntryDialog(entry, label, modal));
    deleteAllButton.disabled = true;
  });
  closeButton.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
  window.addEventListener("keydown", function onKeydown(event) {
    if (event.key !== "Escape") return;
    close();
    window.removeEventListener("keydown", onKeydown);
  });
  window.setTimeout(() => {
    const firstEntry = list.querySelector(".focusLog-item:not(.focusLog-empty-log)");
    (firstEntry || closeButton).focus({ preventScroll: true });
  }, 30);
}

function buildfocusLogLogList(container, onEntryClick) {
  const groupedEntries = focusLogEntries.reduce((groups, entry) => {
    if (!groups.has(entry.date)) groups.set(entry.date, []);
    groups.get(entry.date).push(entry);
    return groups;
  }, new Map());
  const dateKeys = [...new Set(focusLogEntries.map((entry) => entry.date))]
    .sort((first, second) => second.localeCompare(first));

  dateKeys.forEach((dateKey) => {
    const entries = groupedEntries.get(dateKey) || [];
    if (!entries.length) return;
    const group = document.createElement("section");
    const heading = document.createElement("h3");
    const dateLabel = formatEntryDate(dateKey);
    group.className = "focusLog-date-group";
    heading.className = "focusLog-date-heading";
    heading.textContent = `${dateLabel} - ${entries.length} entr${entries.length === 1 ? "y" : "ies"}`;
    group.appendChild(heading);
    entries.forEach((entry, index) => {
      const item = document.createElement("button");
      const text = document.createElement("span");
      const title = document.createElement("strong");
      const meta = document.createElement("span");
      const label = getfocusLogEntryPreview(entry, index);
      item.className = "archiveB-item focusLog-item";
      item.type = "button";
      item.setAttribute("aria-label", `${label}, ${dateLabel}`);
      title.textContent = label;
      meta.textContent = dateLabel;
      item.addEventListener("click", () => onEntryClick(entry, label));
      text.append(title, meta);
      item.appendChild(text);
      group.appendChild(item);
    });
    container.appendChild(group);
  });
  if (!container.children.length) {
    const emptyItem = document.createElement("div");
    emptyItem.className = "archiveA-empty";
    emptyItem.textContent = "No focusLog entries logged.";
    container.appendChild(emptyItem);
  }
}

function getfocusLogEntryPreview(entry, index) {
  const preview = String(entry.text || "").replace(/\s+/g, " ").trim();
  if (preview) return preview.length > 72 ? `${preview.slice(0, 72)}...` : preview;
  return `focusLog entry ${index + 1}`;
}

function buildfocusLogEmptyLogItem(dateKey) {
  const emptyItem = document.createElement("div");
  const text = document.createElement("span");
  const title = document.createElement("strong");
  const meta = document.createElement("span");
  emptyItem.className = "archiveB-item focusLog-item focusLog-empty-log";
  title.textContent = "No entry logged";
  meta.textContent = formatEntryDate(dateKey);
  text.append(title, meta);
  emptyItem.appendChild(text);
  return emptyItem;
}

function openfocusLogEntryDialog(entry, label, returnModal = null) {
  if (returnModal) returnModal.hidden = true;
  const modal = document.createElement("section");
  const panel = document.createElement("div");
  const heading = document.createElement("div");
  const titleWrap = document.createElement("div");
  const eyebrow = document.createElement("p");
  const title = document.createElement("h2");
  const actions = document.createElement("div");
  const backButton = document.createElement("button");
  const deleteButton = document.createElement("button");
  const closeButton = document.createElement("button");
  const body = document.createElement("p");

  modal.className = "history-modal focusLog-entry-modal";
  modal.setAttribute("aria-labelledby", "focusLogEntryTitle");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("role", "dialog");
  panel.className = "history-panel focusLog-entry-panel";
  heading.className = "section-heading";
  eyebrow.className = "eyebrow";
  eyebrow.textContent = label;
  title.id = "focusLogEntryTitle";
  title.textContent = formatEntryDate(entry.date);
  actions.className = "focusLog-entry-actions";
  backButton.className = "text-button focusLog-back-button";
  backButton.type = "button";
  backButton.textContent = "Back";
  backButton.hidden = !returnModal;
  deleteButton.className = "text-button focusLog-delete-button danger-action";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  closeButton.className = "delete-button";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close focusLog entry");
  closeButton.textContent = "x";
  body.className = "focusLog-entry-text";
  body.textContent = entry.text;

  actions.append(backButton, deleteButton, closeButton);
  titleWrap.append(eyebrow, title);
  heading.append(titleWrap, actions);
  panel.append(heading, body);
  modal.appendChild(panel);
  document.body.appendChild(modal);

  const close = () => {
    modal.remove();
    if (returnModal) returnModal.hidden = false;
  };
  backButton.addEventListener("click", close);
  deleteButton.addEventListener("click", () => {
    if (!window.confirm("Are you sure you want to delete this focusLog entry? This cannot be undone.")) return;
    deletefocusLogEntry(entry.id);
    modal.remove();
    if (returnModal) {
      returnModal.remove();
      openfocusLogLogList();
    }
  });
  closeButton.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
  window.addEventListener("keydown", function onKeydown(event) {
    if (event.key !== "Escape") return;
    close();
    window.removeEventListener("keydown", onKeydown);
  });
}

function deletefocusLogEntry(id) {
  const entry = focusLogEntries.find((item) => item.id === id);
  if (entry?.date && entry?.text) {
    const deletedKeys = loadDeletedfocusLogEntryKeys();
    deletedKeys.add(`${entry.date}:${entry.text}`);
    saveDeletedfocusLogEntryKeys(deletedKeys);
  }
  focusLogEntries = focusLogEntries.filter((entry) => entry.id !== id);
  savefocusLogEntries();
  renderfocusLog();
  scheduleSmartCoachRender();
  showToast("focusLog entry deleted.");
}

function deleteAllfocusLogEntries() {
  const deletedKeys = loadDeletedfocusLogEntryKeys();
  focusLogEntries.forEach((entry) => {
    if (entry?.date && entry?.text) deletedKeys.add(`${entry.date}:${entry.text}`);
  });
  saveDeletedfocusLogEntryKeys(deletedKeys);
  focusLogEntries = [];
  localStorage.setItem(focusLogStoreKey, JSON.stringify([]));
  ["habit-tracker:focusLog:v1", "habit-tracker:focusLog", "focusLogEntries"].forEach((key) => {
    localStorage.removeItem(key);
  });
  renderfocusLog();
  scheduleSmartCoachRender();
  showToast("All focusLog entries deleted.");
}

function editHabit(id) {
  const habit = habits.find((item) => item.id === id);
  if (!habit) return;
  editingHabitId = id;
  habitName.value = habit.name;
  if (taskDate) taskDate.value = getTaskDateKey(habit);
  habitCategory.value = habit.category || "General";
  habitDeadline.value = normalizeTaskTime(habit.deadline);
  habitPriority.value = normalizeTaskPriority(habit.priority);
  if (habitSize) habitSize.value = normalizeTaskSize(habit.size);
  syncTaskChoiceButtons();
  habitNote.value = habit.note || "";
  habitForm.querySelector(".primary-button").textContent = "Save task";
  habitName.focus();
}

function openTaskBreakdownPrompt(task, options = {}) {
  if (!task) return;
  const modal = buildTaskBreakdownShell(task, {
    title: "Photo checklist",
    intro: "Add a photo or a few details. AI will turn the messy part into tiny checkable steps.",
    cancelDeletesTask: Boolean(options.cancelDeletesTask)
  });
  const actions = document.createElement("div");
  const generateButton = document.createElement("button");

  modal.body.appendChild(buildTaskBreakdownDetailInput(task, modal));
  actions.className = "settings-actions task-breakdown-actions task-breakdown-submit-actions";
  generateButton.className = "primary-button";
  generateButton.type = "button";
  generateButton.textContent = "Submit";
  actions.append(generateButton);
  modal.body.appendChild(actions);
  document.body.appendChild(modal.root);
  updateDialogScrollLock();

  generateButton.addEventListener("click", () => generateTaskBreakdown(task, modal));
  if (options.autoPhoto) modal.issuePhotoInput?.click();
  if (options.autoGallery) modal.issueGalleryPhotoInput?.click();
}

function openTaskBreakdownDialog(task) {
  if (!task) return;
  const breakdown = taskBreakdowns[task.id];
  const modal = buildTaskBreakdownShell(task, {
    title: breakdown ? "AI checklist" : "Photo checklist",
    intro: breakdown ? breakdown.summary : "Add a photo or a few details. AI will turn the messy part into tiny checkable steps."
  });
  document.body.appendChild(modal.root);
  updateDialogScrollLock();

  if (breakdown) {
    renderTaskBreakdownSteps(task, modal, breakdown);
  } else {
    const actions = document.createElement("div");
    const generateButton = document.createElement("button");
    modal.body.appendChild(buildTaskBreakdownDetailInput(task, modal));
    actions.className = "settings-actions task-breakdown-actions task-breakdown-submit-actions";
    generateButton.className = "primary-button";
    generateButton.type = "button";
    generateButton.textContent = "Submit";
    actions.appendChild(generateButton);
    modal.body.appendChild(actions);
    generateButton.addEventListener("click", () => generateTaskBreakdown(task, modal));
  }
}

function openAppHelpBotDialog() {
  const modal = buildTaskBreakdownShell({ name: "TaskLens AI" }, {
    title: "AI help",
    intro: "Ask how to use the app or jump to a task action."
  });
  modal.root.classList.add("app-help-modal");
  const chat = document.createElement("div");
  const inputRow = document.createElement("form");
  const input = document.createElement("input");
  const sendButton = document.createElement("button");

  chat.className = "app-help-chat";
  modal.appHelpChatHistory = [];
  inputRow.className = "app-help-input-row";
  input.type = "text";
  input.maxLength = 1200;
  input.placeholder = "Message TaskLens AI...";
  sendButton.className = "primary-button";
  sendButton.type = "submit";
  sendButton.textContent = "Send";

  addAppHelpMessage(chat, "Tell me what you need help with. I can answer like a normal AI chat, or help you use this app without overloading you.", "assistant", modal);
  inputRow.append(input, sendButton);
  modal.body.append(chat, inputRow);
  document.body.appendChild(modal.root);
  updateDialogScrollLock();
  input.focus();

  inputRow.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = input.value.replace(/\s+/g, " ").trim();
    if (!question) return;
    input.value = "";
    addAppHelpMessage(chat, question, "user", modal);
    answerAppHelpQuestion(question, chat, modal);
  });
}

function addAppHelpMessage(chat, text, role, modal = null) {
  const message = document.createElement("div");
  const normalizedRole = role === "user" ? "user" : "assistant";
  message.className = `app-help-message app-help-message-${normalizedRole === "user" ? "user" : "bot"}`;
  message.textContent = text;
  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
  if (modal?.appHelpChatHistory) {
    modal.appHelpChatHistory.push({ role: normalizedRole, content: String(text || "").slice(0, 1800) });
    modal.appHelpChatHistory = modal.appHelpChatHistory.slice(-12);
  }
  return message;
}

async function answerAppHelpQuestion(question, chat, modal) {
  const normalized = question.toLowerCase();
  let jumpTarget = "";
  let action = "";

  if (/\b(add|create|new)\b.*\btask\b|\btask\b.*\b(add|create|new)\b/.test(normalized)) {
    jumpTarget = "tasks";
  } else if (/\bsort|organize|overwhelm|overwhelmed|clean up|cleanup\b/.test(normalized)) {
    action = "sort";
  } else if (/\bstuck|blocked|can't start|cannot start|task paralysis|paralyzed\b/.test(normalized)) {
    jumpTarget = "tasks";
  } else if (/\bfocus|timer|one task|single task\b/.test(normalized)) {
    jumpTarget = "tasks";
  } else if (/\b(photo|picture|image|camera|inspect)\b|\bai\b.*\bchecklist\b/.test(normalized)) {
    jumpTarget = "tasks";
  } else if (/\bchecklist|steps?|check off|mark\b/.test(normalized)) {
    jumpTarget = "tasks";
  } else if (/\bsetting|backend|ai url|cloud|token\b/.test(normalized)) {
    jumpTarget = "settings";
  } else if (/\bdelete|remove\b/.test(normalized)) {
    jumpTarget = "tasks";
  } else if (/\bedit|change|rename|update\b/.test(normalized)) {
    jumpTarget = "tasks";
  }

  const thinking = addAppHelpMessage(chat, "Thinking...", "assistant");
  try {
    const answer = await fetchAppHelpChatReply(modal?.appHelpChatHistory || [{ role: "user", content: question }]);
    thinking.textContent = answer;
    if (modal?.appHelpChatHistory) {
      modal.appHelpChatHistory.push({ role: "assistant", content: answer.slice(0, 1800) });
      modal.appHelpChatHistory = modal.appHelpChatHistory.slice(-12);
    }
  } catch {
    const fallback = getLocalAppHelpAnswer(question);
    thinking.textContent = fallback;
    if (modal?.appHelpChatHistory) {
      modal.appHelpChatHistory.push({ role: "assistant", content: fallback.slice(0, 1800) });
      modal.appHelpChatHistory = modal.appHelpChatHistory.slice(-12);
    }
  }

  if (action === "sort") {
    const sortButton = document.createElement("button");
    sortButton.className = "text-button app-help-jump";
    sortButton.type = "button";
    sortButton.textContent = "Sort my list";
    sortButton.addEventListener("click", () => {
      organizeTaskListForfocus();
      addAppHelpMessage(chat, "Your open tasks are sorted. Start with the first Now task, preferably Tiny or Small.", "assistant", modal);
    });
    chat.appendChild(sortButton);
    chat.scrollTop = chat.scrollHeight;
    return;
  }
  if (!jumpTarget) return;
  const jumpButton = document.createElement("button");
  jumpButton.className = "text-button app-help-jump";
  jumpButton.type = "button";
  jumpButton.textContent = jumpTarget === "settings" ? "Open settings" : "Go to tasks";
  jumpButton.addEventListener("click", () => {
    closeTaskBreakdownModal(modal.root);
    if (jumpTarget === "settings") {
      settingsButton?.click();
    } else {
      jumpFromDashboard(jumpTarget);
    }
  });
  chat.appendChild(jumpButton);
  chat.scrollTop = chat.scrollHeight;
}

async function fetchAppHelpChatReply(messages) {
  const headers = { "Content-Type": "application/json" };
  if (appSettings.aiBackendToken) headers["X-App-Token"] = appSettings.aiBackendToken;
  const backendUrl = getConfiguredAiBackendUrl();
  if (!backendUrl || !canUseCloudAi()) throw new Error("AI chat is not available.");
  const response = await fetchWithTimeout(`${backendUrl}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ messages })
  }, 30000);
  if (!response.ok) throw new Error(await getFriendlyAiError(response, "AI chat"));
  const data = await response.json();
  return String(data?.reply || "").replace(/\s+/g, " ").trim().slice(0, 2400) || getLocalAppHelpAnswer("");
}

function getLocalAppHelpAnswer(question) {
  const normalized = String(question || "").toLowerCase();
  if (/\b(add|create|new)\b.*\btask\b|\btask\b.*\b(add|create|new)\b/.test(normalized)) {
    return "Use Brain dump at the top: write the messy thought, choose Now/Next/Later and a size, then tap Turn into task.";
  }
  if (/\bsort|organize|overwhelm|overwhelmed|clean up|cleanup\b/.test(normalized)) {
    return "I can sort open tasks so Now comes first, then Next, then Later, with Tiny and deadline tasks pulled upward.";
  }
  if (/\bstuck|blocked|can't start|cannot start|task paralysis|paralyzed\b/.test(normalized)) {
    return "When a task feels stuck, tap Stuck on that task. I will help turn it into the smallest visible next step.";
  }
  if (/\bfocus|timer|one task|single task\b/.test(normalized)) {
    return "Use Focus on a task when you want one-task mode: pick 5, 10, 15, or 25 minutes and stay with only that task.";
  }
  if (/\b(photo|picture|image|camera|inspect)\b|\bai\b.*\bchecklist\b/.test(normalized)) {
    return "Take a picture, add any important detail, then submit it. The checklist comes first; make a target picture only if you need one.";
  }
  if (/\bchecklist|steps?|check off|mark\b/.test(normalized)) {
    return "Open the task's AI List button. Checkboxes mark steps done, text fields let you edit steps, and Add creates another step.";
  }
  if (/\bsetting|settings\b/.test(normalized)) {
    return "Open Settings from the top controls. Keep it simple: turn cloud AI on if you want AI chat and photo checklists.";
  }
  return "AI chat is unavailable right now, but I can still help with the app: add a brain dump task, take a photo for an AI checklist, sort your list, or use Focus on one task.";
}

let activeFocusSessionTimer = null;

function normalizeTaskPriority(value) {
  const priority = String(value || "").trim();
  if (["Now", "Next", "Later"].includes(priority)) return priority;
  if (/high/i.test(priority)) return "Now";
  if (/low/i.test(priority)) return "Later";
  return "Next";
}

function normalizeTaskSize(value) {
  const size = String(value || "").trim();
  return ["Tiny", "Small", "Medium", "Big"].includes(size) ? size : "Small";
}

function organizeTaskListForfocus() {
  const priorityOrder = { Now: 0, Next: 1, Later: 2 };
  const sizeOrder = { Tiny: 0, Small: 1, Medium: 2, Big: 3 };
  habits = [...habits].sort((first, second) => {
    const firstDone = first.completions?.includes(getTaskDateKey(first)) ? 1 : 0;
    const secondDone = second.completions?.includes(getTaskDateKey(second)) ? 1 : 0;
    if (firstDone !== secondDone) return firstDone - secondDone;
    const firstDate = getTaskDateKey(first);
    const secondDate = getTaskDateKey(second);
    if (firstDate !== secondDate) return firstDate.localeCompare(secondDate);
    const priorityDiff = (priorityOrder[normalizeTaskPriority(first.priority)] ?? 1) - (priorityOrder[normalizeTaskPriority(second.priority)] ?? 1);
    if (priorityDiff) return priorityDiff;
    const firstDeadline = normalizeTaskTime(first.deadline) || "99:99";
    const secondDeadline = normalizeTaskTime(second.deadline) || "99:99";
    if (firstDeadline !== secondDeadline) return firstDeadline.localeCompare(secondDeadline);
    return (sizeOrder[normalizeTaskSize(first.size)] ?? 1) - (sizeOrder[normalizeTaskSize(second.size)] ?? 1);
  });
  saveHabits();
  render();
  showToast("List sorted into a calmer order.");
}

function openTaskStuckDialog(task) {
  if (!task) return;
  const modal = buildTaskBreakdownShell(task, {
    title: "Stuck mode",
    intro: "Name the blocker. TaskLens will make the next step smaller."
  });
  modal.root.classList.add("task-stuck-modal");
  const field = document.createElement("textarea");
  const suggestion = document.createElement("p");
  const actions = document.createElement("div");
  const makeStepButton = document.createElement("button");
  const closeButton = document.createElement("button");

  field.rows = 4;
  field.maxLength = 360;
  field.placeholder = "What is blocking you? Too vague, too big, missing info, don't know where to start...";
  field.className = "task-stuck-input";
  suggestion.className = "task-stuck-suggestion";
  suggestion.textContent = getTinyNextStep(task, "");
  actions.className = "settings-actions task-breakdown-actions";
  makeStepButton.className = "primary-button";
  makeStepButton.type = "button";
  makeStepButton.textContent = "Make this the first step";
  closeButton.className = "text-button";
  closeButton.type = "button";
  closeButton.textContent = "Close";

  field.addEventListener("input", () => {
    suggestion.textContent = getTinyNextStep(task, field.value);
  });
  makeStepButton.addEventListener("click", () => {
    addTinyStepToTaskBreakdown(task, suggestion.textContent, field.value);
    closeTaskBreakdownModal(modal.root);
    openTaskBreakdownDialog(task);
  });
  closeButton.addEventListener("click", () => closeTaskBreakdownModal(modal.root));

  actions.append(makeStepButton, closeButton);
  modal.body.append(field, suggestion, actions);
  document.body.appendChild(modal.root);
  updateDialogScrollLock();
  field.focus();
}

function getTinyNextStep(task, blocker) {
  const taskName = String(task?.name || "this task").trim();
  const text = String(blocker || "").toLowerCase();
  if (/\bcall|phone|text|email|message\b/.test(taskName.toLowerCase())) return `Open the contact or message thread for "${taskName}".`;
  if (/\bclean|room|kitchen|laundry|dishes|trash\b/.test(taskName.toLowerCase())) return "Set a 5-minute timer and move only five visible items.";
  if (/\bmissing|info|information|don't know|dont know|unsure|confused\b/.test(text)) return "Write down the one piece of information needed before doing anything else.";
  if (/\btoo big|overwhelming|overwhelmed|huge|many\b/.test(text) || normalizeTaskSize(task?.size) === "Big") return `Do only the first two minutes of "${taskName}". Stop after that if needed.`;
  return `Open whatever you need for "${taskName}" and do the first visible action.`;
}

function addTinyStepToTaskBreakdown(task, stepText, blocker) {
  const existing = taskBreakdowns[task.id] || {
    title: task.name,
    summary: "Start with the smallest visible step.",
    generatedAt: new Date().toISOString(),
    sourcePrompt: String(blocker || task.note || "").trim(),
    sourceImageDataUrl: "",
    steps: []
  };
  existing.steps = [{
    id: `${task.id}:stuck:${Date.now()}`,
    text: String(stepText || "").trim().slice(0, 180),
    done: false
  }, ...(existing.steps || [])].slice(0, 12);
  existing.summary = "Start with the smallest visible step.";
  existing.sourcePrompt = String(blocker || existing.sourcePrompt || "").trim().slice(0, 1600);
  taskBreakdowns = { ...taskBreakdowns, [task.id]: existing };
  saveTaskBreakdowns();
  render();
}

function openTaskFocusDialog(task) {
  if (!task) return;
  const modal = buildTaskBreakdownShell(task, {
    title: "Focus session",
    intro: "Pick one short timer for this task."
  });
  modal.root.classList.add("task-focus-modal");
  const timer = document.createElement("div");
  const choices = document.createElement("div");
  const actions = document.createElement("div");
  const doneButton = document.createElement("button");
  const smallerButton = document.createElement("button");
  const closeButton = document.createElement("button");
  const minuteOptions = [5, 10, 15, 25];

  timer.className = "task-focus-timer";
  timer.textContent = "Choose a timer";
  choices.className = "task-focus-choices";
  actions.className = "settings-actions task-breakdown-actions";

  minuteOptions.forEach((minutes) => {
    const button = document.createElement("button");
    button.className = "text-button";
    button.type = "button";
    button.textContent = `${minutes} min`;
    button.addEventListener("click", () => startTaskFocusSession(minutes, timer, modal.intro));
    choices.appendChild(button);
  });

  doneButton.className = "primary-button";
  doneButton.type = "button";
  doneButton.textContent = "Mark task done";
  doneButton.addEventListener("click", () => {
    const dateKey = getTaskDateKey(task);
    if (!task.completions.includes(dateKey)) {
      toggleHabit(task.id, dateKey);
    }
    closeTaskBreakdownModal(modal.root);
  });
  smallerButton.className = "text-button";
  smallerButton.type = "button";
  smallerButton.textContent = "Break smaller";
  smallerButton.addEventListener("click", () => {
    closeTaskBreakdownModal(modal.root);
    openTaskStuckDialog(task);
  });
  closeButton.className = "text-button";
  closeButton.type = "button";
  closeButton.textContent = "Close";
  closeButton.addEventListener("click", () => closeTaskBreakdownModal(modal.root));

  actions.append(doneButton, smallerButton, closeButton);
  modal.body.append(timer, choices, actions);
  document.body.appendChild(modal.root);
  updateDialogScrollLock();
}

function startTaskFocusSession(minutes, timer, intro) {
  window.clearInterval(activeFocusSessionTimer);
  let remaining = Math.max(1, minutes) * 60;
  const renderTime = () => {
    const mins = Math.floor(remaining / 60);
    const secs = String(remaining % 60).padStart(2, "0");
    timer.textContent = `${mins}:${secs}`;
  };
  renderTime();
  if (intro) intro.textContent = "Stay with one task. When the timer ends, choose done, continue, or break smaller.";
  activeFocusSessionTimer = window.setInterval(() => {
    remaining -= 1;
    renderTime();
    if (remaining <= 0) {
      window.clearInterval(activeFocusSessionTimer);
      activeFocusSessionTimer = null;
      timer.textContent = "Time is up";
      if (intro) intro.textContent = "Done, continue, or make the task smaller.";
      showToast("Focus session finished.");
    }
  }, 1000);
}

function buildTaskBreakdownShell(task, content) {
  const root = document.createElement("section");
  const panel = document.createElement("div");
  const heading = document.createElement("div");
  const titleWrap = document.createElement("div");
  const eyebrow = document.createElement("p");
  const title = document.createElement("h2");
  const closeButton = document.createElement("button");
  const intro = document.createElement("p");
  const body = document.createElement("div");

  root.className = "history-modal task-breakdown-modal";
  root.setAttribute("aria-labelledby", "taskBreakdownTitle");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("role", "dialog");
  panel.className = "history-panel task-breakdown-panel";
  root.taskBreakdownTaskId = task.id;
  root.taskBreakdownCancelDeletesTask = Boolean(content.cancelDeletesTask);
  root.taskBreakdownSaved = !content.cancelDeletesTask;
  heading.className = "section-heading";
  eyebrow.className = "eyebrow";
  eyebrow.textContent = task.name;
  title.id = "taskBreakdownTitle";
  title.textContent = content.title;
  closeButton.className = "delete-button";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", content.cancelDeletesTask ? "Cancel task" : "Close task steps");
  closeButton.textContent = "x";
  intro.className = "task-breakdown-intro";
  intro.textContent = content.intro || "";
  body.className = "task-breakdown-body";

  titleWrap.append(eyebrow, title);
  heading.append(titleWrap, closeButton);
  panel.append(heading, intro, body);
  root.appendChild(panel);

  closeButton.addEventListener("click", () => closeTaskBreakdownModal(root, { cancel: true }));
  root.addEventListener("click", (event) => {
    if (event.target === root) closeTaskBreakdownModal(root, { cancel: true });
  });

  return { root, panel, eyebrow, intro, body };
}

function buildTaskBreakdownDetailInput(task, modal) {
  const wrap = document.createElement("div");
  const composer = document.createElement("div");
  const textarea = document.createElement("textarea");
  const photoInput = document.createElement("input");
  const galleryInput = document.createElement("input");
  const photoButton = document.createElement("button");
  const galleryButton = document.createElement("button");
  const photoPreview = document.createElement("img");
  const photoAnalysis = document.createElement("p");
  const tools = document.createElement("div");

  wrap.className = "task-breakdown-detail-box";

  composer.className = "task-breakdown-composer";
  textarea.rows = 3;
  textarea.maxLength = 1600;
  textarea.placeholder = "What should AI notice or prioritize?";
  textarea.value = "";
  modal.detailsInput = textarea;

  photoInput.type = "file";
  photoInput.accept = "image/*";
  photoInput.capture = "environment";
  photoInput.className = "task-breakdown-photo-input";
  photoInput.hidden = true;
  galleryInput.type = "file";
  galleryInput.accept = "image/*";
  galleryInput.className = "task-breakdown-photo-input";
  galleryInput.hidden = true;
  photoButton.className = "text-button task-breakdown-icon-button";
  photoButton.type = "button";
  photoButton.textContent = "Take photo";
  photoButton.setAttribute("aria-label", "Take a photo for AI");
  galleryButton.className = "text-button task-breakdown-icon-button";
  galleryButton.type = "button";
  galleryButton.textContent = "Choose photo";
  galleryButton.setAttribute("aria-label", "Choose an existing photo for AI");
  photoPreview.className = "task-breakdown-photo-preview";
  photoPreview.alt = "Selected issue photo preview";
  photoPreview.hidden = true;
  photoAnalysis.className = "task-breakdown-photo-analysis";
  photoAnalysis.hidden = true;
  modal.issuePhotoInput = photoInput;
  modal.issueGalleryPhotoInput = galleryInput;
  modal.issuePhotoButton = photoButton;
  modal.issueGalleryPhotoButton = galleryButton;
  modal.issuePhotoPreview = photoPreview;
  modal.issuePhotoAnalysis = photoAnalysis;
  modal.issueQuestionInput = textarea;
  modal.task = task;

  tools.className = "task-breakdown-tools";
  photoInput.addEventListener("change", () => handleTaskBreakdownPhoto(photoInput, modal));
  galleryInput.addEventListener("change", () => handleTaskBreakdownPhoto(galleryInput, modal));
  photoButton.addEventListener("click", () => photoInput.click());
  galleryButton.addEventListener("click", () => galleryInput.click());

  tools.append(photoButton, galleryButton);
  composer.append(textarea, photoInput, galleryInput);
  wrap.append(photoPreview, photoAnalysis, composer, tools);
  return wrap;
}

async function handleTaskBreakdownPhoto(input, modal) {
  const file = input.files?.[0];
  if (!file) return;
  if (!/^image\//i.test(file.type)) {
    showToast("Choose an image for AI to inspect.");
    input.value = "";
    return;
  }
  try {
    if (modal.issuePhotoAnalysis) {
      modal.issuePhotoAnalysis.hidden = false;
      modal.issuePhotoAnalysis.textContent = "Compressing photo...";
    }
    const startedAt = performance.now();
    const resized = await prepareTaskBreakdownImages(file);
    const resizeMs = Math.round(performance.now() - startedAt);
    modal.issueImageDataUrl = resized.upload;
    modal.issueImagePreviewDataUrl = resized.preview;
    modal.issuePhotoTelemetry = {
      uploadBytes: resized.upload.length,
      resizeMs
    };
    modal.issuePhotoPreview.src = resized.preview;
    modal.issuePhotoPreview.hidden = false;
    if (modal.issuePhotoButton) modal.issuePhotoButton.textContent = "Retake photo";
    if (modal.issueGalleryPhotoButton) modal.issueGalleryPhotoButton.textContent = "Choose another";
    if (modal.issuePhotoAnalysis) {
      modal.issuePhotoAnalysis.hidden = false;
      modal.issuePhotoAnalysis.textContent = "Photo ready. Submit to build the checklist.";
    }
  } catch {
    modal.issueImageDataUrl = "";
    modal.issueImagePreviewDataUrl = "";
    modal.issuePhotoTelemetry = null;
    input.value = "";
    if (modal.issuePhotoButton) modal.issuePhotoButton.textContent = "Take photo";
    if (modal.issueGalleryPhotoButton) modal.issueGalleryPhotoButton.textContent = "Choose photo";
    if (modal.issuePhotoAnalysis) {
      modal.issuePhotoAnalysis.hidden = true;
      modal.issuePhotoAnalysis.textContent = "";
    }
    showToast("Could not read that image.");
  }
}

async function prepareTaskBreakdownImages(file) {
  const image = await loadTaskBreakdownImageFile(file);
  const preview = renderTaskBreakdownImageDataUrl(image, 640, 0.64);
  const attempts = [
    [520, 0.46],
    [420, 0.38],
    [320, 0.32],
    [240, 0.28]
  ];
  for (const [maxSide, quality] of attempts) {
    const upload = renderTaskBreakdownImageDataUrl(image, maxSide, quality);
    if (upload.length <= 180000) return { upload, preview };
  }
  return {
    upload: renderTaskBreakdownImageDataUrl(image, 240, 0.24),
    preview
  };
}

function loadTaskBreakdownImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => resolve(image);
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

function renderTaskBreakdownImageDataUrl(image, maxSide = 1200, quality = 0.82) {
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

async function downscaleTaskBreakdownImageDataUrl(imageDataUrl, maxSide = 420, quality = 0.36) {
  const source = String(imageDataUrl || "").trim();
  if (!source.startsWith("data:image/")) return "";
  return new Promise((resolve) => {
    const image = new Image();
    image.onerror = () => resolve("");
    image.onload = () => {
      try {
        resolve(renderTaskBreakdownImageDataUrl(image, maxSide, quality));
      } catch {
        resolve("");
      }
    };
    image.src = source;
  });
}

async function resizeTaskBreakdownImage(file, maxSide = 1200, quality = 0.82) {
  const image = await loadTaskBreakdownImageFile(file);
  return renderTaskBreakdownImageDataUrl(image, maxSide, quality);
}

function getTaskBreakdownDetailItems(task) {
  return [
    task.name,
    getTaskDateKey(task) ? formatarchiveBHistoryDate(getTaskDateKey(task)) : "",
    formatTaskDeadline(task.deadline),
    task.category || "General",
    normalizeTaskPriority(task.priority),
    normalizeTaskSize(task.size),
    task.note ? `Note: ${task.note}` : ""
  ].filter(Boolean);
}

function closeTaskBreakdownModal(modal, options = {}) {
  if (modal?.classList?.contains("task-focus-modal")) {
    window.clearInterval(activeFocusSessionTimer);
    activeFocusSessionTimer = null;
  }
  if (options.cancel && modal?.taskBreakdownCancelDeletesTask && !modal.taskBreakdownSaved) {
    const taskId = String(modal.taskBreakdownTaskId || "");
    if (taskId) {
      habits = habits.filter((habit) => String(habit.id || "") !== taskId);
      delete taskBreakdowns[taskId];
      saveHabits();
      saveTaskBreakdowns();
      render();
      showToast("Task canceled.");
    }
  }
  modal?.remove();
  updateDialogScrollLock();
}

async function generateTaskBreakdown(task, modal) {
  const hasPhotoUpload = Boolean(String(modal?.issueImageDataUrl || "").startsWith("data:image/"));
  const replacingExistingBreakdown = Boolean(taskBreakdowns[task.id]);
  const requestStartedAt = performance.now();
  const progressTimers = [];
  if (hasPhotoUpload && !canUsePremiumPhotoAi()) {
    showPhotoAiLimitMessage(modal);
    return;
  }
  if (!canUseCloudAi()) {
    if (modal?.intro) modal.intro.textContent = "Enable cloud AI in Settings first.";
    return;
  }
  if (!modal?.body) return;
  setTaskBreakdownLoadingOnly(modal, true);
  modal.body.textContent = "";
  const loading = document.createElement("p");
  loading.className = "task-breakdown-status";
  loading.textContent = hasPhotoUpload
    ? "Reading visible items..."
    : "Building the checklist.";
  modal.body.appendChild(loading);
  if (hasPhotoUpload) {
    progressTimers.push(window.setTimeout(() => {
      if (loading.isConnected) loading.textContent = "Building checklist...";
    }, 1800));
    progressTimers.push(window.setTimeout(() => {
      if (loading.isConnected) loading.textContent = "Saving checklist.";
    }, 8000));
  }

  try {
    const sourcePrompt = String(modal.detailsInput?.value || "").replace(/\s+/g, " ").trim().slice(0, 1600);
    const sourceImageDataUrl = String(modal.issueImagePreviewDataUrl || modal.issueImageDataUrl || "").slice(0, 1200000);
    const breakdown = await fetchTaskBreakdown(task, {
      extraDetails: modal.detailsInput?.value || "",
      issueQuestion: modal.issueQuestionInput?.value || "",
      imageDataUrl: modal.issueImageDataUrl || ""
    });
    progressTimers.forEach((timer) => window.clearTimeout(timer));
    const checklistMs = Math.round(performance.now() - requestStartedAt);
    const tailoredBreakdown = breakdown;
    breakdown.sourcePrompt = sourcePrompt;
    breakdown.sourceImageDataUrl = sourceImageDataUrl.startsWith("data:image/") ? sourceImageDataUrl : "";
    tailoredBreakdown.sourcePrompt = breakdown.sourcePrompt;
    tailoredBreakdown.sourceImageDataUrl = breakdown.sourceImageDataUrl;
    tailoredBreakdown.targetImageDataUrl = "";
    tailoredBreakdown.targetImageError = String(breakdown.targetImageError || "").slice(0, 180);
    tailoredBreakdown.targetImagePending = false;
    tailoredBreakdown.photoAiTelemetry = hasPhotoUpload
      ? normalizePhotoAiTelemetry({
        ...modal.issuePhotoTelemetry,
        checklistMs,
        checklistStatus: "ok",
        recordedAt: new Date().toISOString()
      })
      : normalizePhotoAiTelemetry({});
    taskBreakdowns = { ...taskBreakdowns, [task.id]: tailoredBreakdown };
    saveTaskBreakdowns();
    if (hasPhotoUpload) recordPhotoAiTelemetry(task, tailoredBreakdown, "checklist_ok");
    recordTaskBreakdownAiEvent(task, tailoredBreakdown, "checklist_generated", {
      event: { regenerated: replacingExistingBreakdown },
      context: {
        source: "cloud_ai",
        model: appSettings.aiModel || "backend_default",
        hadPhotoUpload: hasPhotoUpload
      }
    });
    if (hasPhotoUpload) incrementPhotoAiUsage();
    renderTaskBreakdownSteps(task, modal, tailoredBreakdown);
    render();
  } catch (error) {
    progressTimers.forEach((timer) => window.clearTimeout(timer));
    if (hasPhotoUpload) {
      recordPhotoAiTelemetry(task, {
        photoAiTelemetry: normalizePhotoAiTelemetry({
          ...modal.issuePhotoTelemetry,
          checklistMs: Math.round(performance.now() - requestStartedAt),
          checklistStatus: "error",
          recordedAt: new Date().toISOString()
        })
      }, "checklist_error");
    }
    if (!modal?.body) return;
    setTaskBreakdownLoadingOnly(modal, false);
    modal.body.textContent = "";
    const message = document.createElement("p");
    message.className = "task-breakdown-status";
    message.textContent = getTaskBreakdownErrorMessage(error);
    const retryActions = document.createElement("div");
    const retryButton = document.createElement("button");
    const editButton = document.createElement("button");
    retryActions.className = "settings-actions task-breakdown-actions";
    retryButton.className = "primary-button";
    retryButton.type = "button";
    retryButton.textContent = "Try again";
    editButton.className = "text-button";
    editButton.type = "button";
    editButton.textContent = "Edit upload";
    retryButton.addEventListener("click", () => generateTaskBreakdown(task, modal));
    editButton.addEventListener("click", () => {
      modal.body.textContent = "";
      const inputBox = buildTaskBreakdownDetailInput(task, modal);
      const actions = document.createElement("div");
      const sendButton = document.createElement("button");
      actions.className = "settings-actions task-breakdown-actions task-breakdown-submit-actions";
      sendButton.className = "primary-button";
      sendButton.type = "button";
      sendButton.textContent = "Submit";
      sendButton.addEventListener("click", () => generateTaskBreakdown(task, modal));
      actions.appendChild(sendButton);
      modal.body.append(inputBox, actions);
    });
    retryActions.append(retryButton, editButton);
    modal.body.append(message, retryActions);
  }
}

function setTaskBreakdownLoadingOnly(modal, isLoading) {
  modal?.root?.classList?.toggle("task-breakdown-loading-only", Boolean(isLoading));
}

function getPhotoAiUsagePeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getPhotoAiUsage() {
  try {
    const usage = JSON.parse(localStorage.getItem(photoAiUsageStoreKey) || "{}");
    const period = getPhotoAiUsagePeriod();
    return {
      period,
      count: usage?.period === period ? Number(usage.count) || 0 : 0,
      afterCount: usage?.period === period ? Number(usage.afterCount) || 0 : 0
    };
  } catch {
    return { period: getPhotoAiUsagePeriod(), count: 0, afterCount: 0 };
  }
}

function incrementPhotoAiUsage() {
  const usage = getPhotoAiUsage();
  localStorage.setItem(photoAiUsageStoreKey, JSON.stringify({
    period: usage.period,
    count: Math.min(999, usage.count + 1),
    afterCount: usage.afterCount
  }));
}

function incrementAfterImageUsage() {
  const usage = getPhotoAiUsage();
  localStorage.setItem(photoAiUsageStoreKey, JSON.stringify({
    period: usage.period,
    count: usage.count,
    afterCount: Math.min(999, usage.afterCount + 1)
  }));
}

function canUsePremiumPhotoAi() {
  if (appSettings.premiumUnlocked) return getPhotoAiUsage().count < PREMIUM_PHOTO_AI_LIMIT;
  return getPhotoAiUsage().count < FREE_PHOTO_AI_LIMIT;
}

function canUseAfterImageAi() {
  return Boolean(appSettings.premiumUnlocked) && getPhotoAiUsage().afterCount < PREMIUM_AFTER_IMAGE_LIMIT;
}

function getPhotoAiUsageLabel() {
  const usage = getPhotoAiUsage();
  if (appSettings.premiumUnlocked) {
    return `${Math.max(0, PREMIUM_PHOTO_AI_LIMIT - usage.count)} of ${PREMIUM_PHOTO_AI_LIMIT} premium before-photo checklists and ${Math.max(0, PREMIUM_AFTER_IMAGE_LIMIT - usage.afterCount)} of ${PREMIUM_AFTER_IMAGE_LIMIT} after pictures left this month.`;
  }
  return `${Math.max(0, FREE_PHOTO_AI_LIMIT - usage.count)} of ${FREE_PHOTO_AI_LIMIT} free photo checklists left this month.`;
}

function showPhotoAiLimitMessage(modal) {
  if (!modal?.body) return;
  modal.body.textContent = "";
  const message = document.createElement("p");
  const actions = document.createElement("div");
  const textOnlyButton = document.createElement("button");
  const settingsButtonLocal = document.createElement("button");
  message.className = "task-breakdown-status";
  message.textContent = `You used the ${FREE_PHOTO_AI_LIMIT} free photo checklists for this month. Premium includes ${PREMIUM_PHOTO_AI_LIMIT} before-photo checklists and ${PREMIUM_AFTER_IMAGE_LIMIT} after pictures per month for ${PREMIUM_MONTHLY_PRICE} or ${PREMIUM_YEARLY_PRICE}. Text-only task checklists still work.`;
  actions.className = "settings-actions task-breakdown-actions";
  textOnlyButton.className = "primary-button";
  textOnlyButton.type = "button";
  textOnlyButton.textContent = "Use text only";
  settingsButtonLocal.className = "text-button";
  settingsButtonLocal.type = "button";
  settingsButtonLocal.textContent = "View Premium";
  textOnlyButton.addEventListener("click", () => {
    modal.issueImageDataUrl = "";
    modal.issueImagePreviewDataUrl = "";
    generateTaskBreakdown(modal.task, modal);
  });
  settingsButtonLocal.addEventListener("click", () => accountButton?.click());
  actions.append(textOnlyButton, settingsButtonLocal);
  modal.body.append(message, actions);
}

function showAfterImageLimitMessage() {
  if (!appSettings.premiumUnlocked) {
    showToast(`After pictures are included with Premium: ${PREMIUM_MONTHLY_PRICE} or ${PREMIUM_YEARLY_PRICE}.`);
    accountButton?.click();
    return;
  }
  showToast(`You used all ${PREMIUM_AFTER_IMAGE_LIMIT} Premium after pictures for this month.`);
}

function getTaskBreakdownErrorMessage(error) {
  const message = String(error?.message || "");
  if (/signal is aborted|aborterror|aborted|timed out|timeout/i.test(message)) {
    return "AI photo upload took too long. Try again, or retake a clearer smaller photo.";
  }
  return message || "AI could not break down this task.";
}

async function fetchTaskBreakdown(task, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (appSettings.aiBackendToken) headers["X-App-Token"] = appSettings.aiBackendToken;
  const accountIdToken = await getTaskLensAccountIdToken();
  if (accountIdToken) headers.Authorization = `Bearer ${accountIdToken}`;
  const backendUrl = getConfiguredAiBackendUrl();
  if (!backendUrl) throw new Error("AI service is not configured.");
  const imageDataUrl = String(options.imageDataUrl || "").slice(0, 900000);
  const requestBody = () => JSON.stringify({
    task: {
      name: task.name,
      date: getTaskDateKey(task),
      day: getTaskDay(task),
      category: task.category,
      priority: task.priority,
      size: task.size,
      deadline: task.deadline,
      note: task.note,
      dictationDetails: buildTaskBreakdownContext(task, options),
      issueQuestion: String(options.issueQuestion || "").trim().slice(0, 500),
      imageDataUrl
    }
  });
  try {
    const response = await fetchWithTimeout(`${backendUrl}/api/tasks/breakdown`, {
      method: "POST",
      headers,
      body: requestBody()
    }, AI_TASK_BREAKDOWN_TIMEOUT_MS);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("That backend has not been updated for AI task photos yet. Deploy the latest backend, then try again.");
      }
      if (response.status === 413) {
        throw new Error("That photo is too large for the backend. Try a smaller photo.");
      }
      throw new Error(await getFriendlyAiError(response, "AI task breakdown"));
    }
    return normalizeTaskBreakdown(await response.json(), task);
  } catch (error) {
    const message = String(error?.message || "");
    if (imageDataUrl && /failed to fetch|networkerror|network error|fetch failed/i.test(message)) {
      const smallerImageDataUrl = await downscaleTaskBreakdownImageDataUrl(imageDataUrl);
      if (smallerImageDataUrl && smallerImageDataUrl.length < imageDataUrl.length) {
        const retryResponse = await fetchWithTimeout(`${backendUrl}/api/tasks/breakdown`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            task: {
              name: task.name,
              date: getTaskDateKey(task),
              day: getTaskDay(task),
              category: task.category,
              priority: task.priority,
              size: task.size,
              deadline: task.deadline,
              note: task.note,
              dictationDetails: buildTaskBreakdownContext(task, options),
              issueQuestion: String(options.issueQuestion || "").trim().slice(0, 500),
              imageDataUrl: smallerImageDataUrl.slice(0, 900000)
            }
          })
        }, AI_TASK_BREAKDOWN_TIMEOUT_MS);
        if (retryResponse.ok) {
          return normalizeTaskBreakdown(await retryResponse.json(), task);
        }
        if (retryResponse.status === 404) {
          throw new Error("That backend has not been updated for AI task photos yet. Deploy the latest backend, then try again.");
        }
        if (retryResponse.status === 413) {
          throw new Error("That photo is too large for the backend. Try a smaller photo.");
        }
        throw new Error(await getFriendlyAiError(retryResponse, "AI task breakdown"));
      }
    }
    throw error;
  }
}

async function fetchTaskTargetImage(task, breakdown) {
  const imageDataUrl = String(breakdown?.sourceImageDataUrl || "").startsWith("data:image/")
    ? String(breakdown.sourceImageDataUrl).slice(0, 900000)
    : "";
  if (!imageDataUrl) return null;
  const headers = { "Content-Type": "application/json" };
  if (appSettings.aiBackendToken) headers["X-App-Token"] = appSettings.aiBackendToken;
  const accountIdToken = await getTaskLensAccountIdToken();
  if (accountIdToken) headers.Authorization = `Bearer ${accountIdToken}`;
  const backendUrl = getConfiguredAiBackendUrl();
  if (!backendUrl) throw new Error("AI service is not configured.");
  const response = await fetchWithTimeout(`${backendUrl}/api/tasks/target-image`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      task: {
        name: task.name,
        date: getTaskDateKey(task),
        day: getTaskDay(task),
        category: task.category,
        priority: task.priority,
        size: task.size,
        deadline: task.deadline,
        note: task.note,
        dictationDetails: breakdown.sourcePrompt || "",
        imageDataUrl
      },
      breakdown: {
        title: breakdown.title,
        summary: breakdown.summary,
        steps: Array.isArray(breakdown.steps) ? breakdown.steps.map((step) => ({ text: step.text })) : []
      }
    })
  }, AI_TARGET_IMAGE_TIMEOUT_MS);
  if (!response.ok) {
    throw new Error(await getFriendlyAiError(response, "AI target picture"));
  }
  const data = await response.json();
  const targetImageDataUrl = String(data?.targetImageDataUrl || "");
  return targetImageDataUrl.startsWith("data:image/") ? targetImageDataUrl.slice(0, 2200000) : null;
}

async function getTaskLensAccountIdToken() {
  try {
    if (typeof window.TaskLensAuth?.getIdToken === "function") {
      return String(await window.TaskLensAuth.getIdToken() || "").trim();
    }
  } catch {
    // The backend will return a sign-in error if account enforcement is enabled.
  }
  return "";
}

async function fetchAndSaveTaskTargetImage(task, modal, breakdown) {
  const requestStartedAt = performance.now();
  try {
    const currentBeforeRequest = taskBreakdowns[task.id];
    if (!currentBeforeRequest || currentBeforeRequest.generatedAt !== breakdown.generatedAt) return;
    taskBreakdowns[task.id] = {
      ...currentBeforeRequest,
      targetImagePending: true,
      targetImageError: ""
    };
    saveTaskBreakdowns();
    if (modal?.body?.isConnected) renderTaskBreakdownSteps(task, modal, taskBreakdowns[task.id]);
    const targetImageDataUrl = await fetchTaskTargetImage(task, breakdown);
    const afterImageMs = Math.round(performance.now() - requestStartedAt);
    const current = taskBreakdowns[task.id];
    if (!current || current.generatedAt !== breakdown.generatedAt) return;
    taskBreakdowns[task.id] = {
      ...current,
      photoAiTelemetry: normalizePhotoAiTelemetry({
        ...current.photoAiTelemetry,
        afterImageMs,
        afterImageStatus: targetImageDataUrl ? "ok" : "empty",
        recordedAt: new Date().toISOString()
      }),
      targetImageDataUrl: targetImageDataUrl || "",
      targetImageError: targetImageDataUrl ? "" : "Target picture could not be created.",
      targetImagePending: false
    };
    saveTaskBreakdowns();
    incrementAfterImageUsage();
    recordPhotoAiTelemetry(task, taskBreakdowns[task.id], targetImageDataUrl ? "after_image_ok" : "after_image_empty");
    if (modal?.body?.isConnected) renderTaskBreakdownSteps(task, modal, taskBreakdowns[task.id]);
    render();
  } catch (error) {
    const current = taskBreakdowns[task.id];
    if (!current || current.generatedAt !== breakdown.generatedAt) return;
    taskBreakdowns[task.id] = {
      ...current,
      photoAiTelemetry: normalizePhotoAiTelemetry({
        ...current.photoAiTelemetry,
        afterImageMs: Math.round(performance.now() - requestStartedAt),
        afterImageStatus: "error",
        recordedAt: new Date().toISOString()
      }),
      targetImageError: String(error?.message || "Target picture could not be created.").slice(0, 180),
      targetImagePending: false
    };
    saveTaskBreakdowns();
    recordPhotoAiTelemetry(task, taskBreakdowns[task.id], "after_image_error");
    if (modal?.body?.isConnected) renderTaskBreakdownSteps(task, modal, taskBreakdowns[task.id]);
  }
}

function recordPhotoAiTelemetry(task, breakdown, eventName) {
  try {
    const saved = JSON.parse(localStorage.getItem(photoAiTelemetryStoreKey) || "[]");
    const entries = Array.isArray(saved) ? saved : [];
    const telemetry = normalizePhotoAiTelemetry(breakdown?.photoAiTelemetry);
    entries.push({
      event: String(eventName || "photo_flow").slice(0, 60),
      taskId: String(task?.id || "").slice(0, 80),
      taskName: String(task?.name || "").slice(0, 120),
      uploadBytes: telemetry.uploadBytes,
      resizeMs: telemetry.resizeMs,
      checklistMs: telemetry.checklistMs,
      afterImageMs: telemetry.afterImageMs,
      checklistStatus: telemetry.checklistStatus,
      afterImageStatus: telemetry.afterImageStatus,
      recordedAt: new Date().toISOString()
    });
    localStorage.setItem(photoAiTelemetryStoreKey, JSON.stringify(entries.slice(-80)));
  } catch {
    // Telemetry must never block the task flow.
  }
}

function requestTaskTargetImage(task, modal, breakdown) {
  if (!String(breakdown?.sourceImageDataUrl || "").startsWith("data:image/")) {
    showToast("Add a before photo first.");
    return;
  }
  if (!canUseAfterImageAi()) {
    showAfterImageLimitMessage();
    return;
  }
  if (breakdown.targetImagePending) return;
  fetchAndSaveTaskTargetImage(task, modal, breakdown);
}

function maybeRequestAutomaticTaskAfterImage(task, modal, breakdown) {
  return;
}

function buildTaskBreakdownContext(task, options = {}) {
  return [
    String(options.extraDetails || "").trim(),
    buildTaskLearningContext(task),
    `Planning bucket: ${normalizeTaskPriority(task.priority)}.`,
    `Task size: ${normalizeTaskSize(task.size)}.`,
    task.deadline ? `Deadline: ${task.deadline}.` : "",
    "Use the learned local task patterns only as context. Make the checklist inspection-grade and photo-grounded. Each step must identify a visible location or object, the exact action, the destination, and a done-check the user can verify in a second photo. Split separate piles, surfaces, corners, containers, cords, papers, dishes, wrappers, clothing, and tools into separate steps. Avoid generic cleanup language."
  ].filter(Boolean).join(" ").slice(0, 2500);
}

function buildTaskLearningContext(task) {
  const currentId = String(task?.id || "");
  const category = String(task?.category || "").trim().toLowerCase();
  const currentTokens = getTaskLearningTokens(`${task?.name || ""} ${task?.note || ""} ${task?.category || ""}`);
  const relatedTasks = habits
    .filter((habit) => habit && String(habit.id || "") !== currentId)
    .map((habit) => {
      const haystack = `${habit.name || ""} ${habit.note || ""} ${habit.category || ""}`;
      const tokens = getTaskLearningTokens(haystack);
      const overlap = tokens.filter((token) => currentTokens.includes(token)).length;
      const sameCategory = category && String(habit.category || "").trim().toLowerCase() === category ? 2 : 0;
      const completionScore = Array.isArray(habit.completions) ? Math.min(3, habit.completions.length) : 0;
      return { habit, score: overlap + sameCategory + completionScore };
    })
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, 5)
    .map(({ habit }) => {
      const status = Array.isArray(habit.completions) && habit.completions.length ? "completed before" : "not completed yet";
      return `${habit.name}${habit.category ? ` (${habit.category})` : ""}${habit.note ? ` - ${habit.note}` : ""} [${status}]`;
    });
  const previousAi = Object.entries(taskBreakdowns || {})
    .filter(([taskId]) => taskId !== currentId)
    .map(([taskId, breakdown]) => {
      const habit = habits.find((item) => String(item.id || "") === String(taskId));
      const text = `${habit?.name || breakdown?.title || ""} ${breakdown?.summary || ""} ${breakdown?.sourcePrompt || ""}`;
      const tokens = getTaskLearningTokens(text);
      const overlap = tokens.filter((token) => currentTokens.includes(token)).length;
      return { breakdown, habit, score: overlap + (habit?.category && category && String(habit.category).toLowerCase() === category ? 2 : 0) };
    })
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, 3)
    .map(({ breakdown, habit }) => `${habit?.name || breakdown?.title || "Previous checklist"}: ${String(breakdown.summary || "").slice(0, 180)}`);
  if (!relatedTasks.length && !previousAi.length) return "";
  return [
    "Learned local context from this device:",
    relatedTasks.length ? `Related past tasks/projects: ${relatedTasks.join(" | ")}.` : "",
    previousAi.length ? `Relevant previous AI checklist patterns: ${previousAi.join(" | ")}.` : "",
    "Adapt the new checklist to these patterns without copying irrelevant steps."
  ].filter(Boolean).join(" ");
}

function getTaskLearningTokens(text) {
  const stopWords = new Set(["the", "and", "for", "with", "this", "that", "task", "thing", "stuff", "from", "into", "need", "needs", "help", "photo", "checklist"]);
  return [...new Set(String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopWords.has(token))
    .slice(0, 40))];
}

function normalizeTaskBreakdown(data, task) {
  const rawSteps = Array.isArray(data?.steps) ? data.steps : [];
  const steps = rawSteps
    .map((step) => typeof step === "string" ? step : step?.text)
    .map((text) => String(text || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((text, index) => ({
      id: `${task.id}:step:${Date.now()}:${index}`,
      text: text.slice(0, 1200),
      done: false
    }));
  if (!steps.length) throw new Error("AI returned no usable steps.");
  return {
    title: String(data?.title || task.name).slice(0, 80),
    summary: String(data?.summary || "Check off each step as you go.").replace(/\s+/g, " ").trim().slice(0, 220),
    generatedAt: new Date().toISOString(),
    targetImageDataUrl: String(data?.targetImageDataUrl || "").startsWith("data:image/")
      ? String(data.targetImageDataUrl).slice(0, 2200000)
      : "",
    targetImageError: String(data?.targetImageError || "").slice(0, 180),
    targetImagePending: Boolean(data?.targetImagePending),
    steps
  };
}

function renderTaskBreakdownSteps(task, modal, breakdown) {
  if (!modal?.body) return;
  setTaskBreakdownLoadingOnly(modal, false);
  if (modal.intro) modal.intro.textContent = breakdown.summary || "Check off each step as you go.";
  modal.body.textContent = "";
  const nameEditor = buildTaskBreakdownNameEditor(task, modal, breakdown);
  const list = document.createElement("div");
  const addForm = document.createElement("form");
  const addInput = document.createElement("input");
  const addButton = document.createElement("button");
  const actions = document.createElement("div");
  const saveButton = document.createElement("button");
  const cancelButton = document.createElement("button");
  const secondaryActions = document.createElement("div");
  const retakePhotoButton = document.createElement("button");
  const helpfulButton = document.createElement("button");
  const notHelpfulButton = document.createElement("button");
  const clearDoneButton = document.createElement("button");
  const sourceCard = buildTaskBreakdownSourceCard(breakdown);
  const afterPhotoCard = buildTaskBreakdownAfterPhotoCard(task, modal, breakdown);

  list.className = "task-breakdown-steps";
  breakdown.steps.forEach((step, index) => {
    const row = document.createElement("div");
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    const text = document.createElement("textarea");
    const deleteButton = document.createElement("button");
    row.className = "task-breakdown-step-row";
    label.className = "task-breakdown-step";
    label.classList.toggle("done", step.done);
    checkbox.type = "checkbox";
    checkbox.checked = step.done;
    text.value = step.text;
    text.rows = 3;
    text.maxLength = 1200;
    text.setAttribute("aria-label", `Step ${index + 1}`);
    autosizeTaskStepText(text);
    deleteButton.className = "text-button task-breakdown-step-delete";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    checkbox.addEventListener("change", () => {
      step.done = checkbox.checked;
      label.classList.toggle("done", step.done);
      taskBreakdowns[task.id] = breakdown;
      saveTaskBreakdowns();
      recordTaskBreakdownAiEvent(task, breakdown, step.done ? "step_completed" : "step_uncompleted", {
        event: {
          stepId: step.id,
          stepText: step.text,
          completed: step.done
        }
      });
    });
    text.addEventListener("change", () => {
      const previousText = step.text;
      step.text = text.value.replace(/\s+/g, " ").trim().slice(0, 1200) || step.text;
      text.value = step.text;
      autosizeTaskStepText(text);
      taskBreakdowns[task.id] = breakdown;
      saveTaskBreakdowns();
      if (step.text !== previousText) {
        recordTaskBreakdownAiEvent(task, breakdown, "step_edited", {
          event: {
            stepId: step.id,
            previousText,
            newText: step.text
          }
        });
      }
    });
    text.addEventListener("input", () => autosizeTaskStepText(text));
    deleteButton.addEventListener("click", () => {
      const deletedText = step.text;
      breakdown.steps.splice(index, 1);
      taskBreakdowns[task.id] = breakdown;
      saveTaskBreakdowns();
      recordTaskBreakdownAiEvent(task, breakdown, "step_deleted", {
        event: {
          stepId: step.id,
          stepText: deletedText
        }
      });
      renderTaskBreakdownSteps(task, modal, breakdown);
    });
    label.append(checkbox, text);
    row.append(label, deleteButton);
    list.appendChild(row);
    queueTaskStepAutosize(text);
  });

  addForm.className = "task-breakdown-add-step";
  addInput.type = "text";
  addInput.maxLength = 1200;
  addInput.placeholder = "Add a step";
  addButton.className = "text-button";
  addButton.type = "submit";
  addButton.textContent = "Add";
  addForm.append(addInput, addButton);
  addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = addInput.value.replace(/\s+/g, " ").trim();
    if (!text) return;
    breakdown.steps.push({
      id: `${task.id}:step:${Date.now()}`,
      text: text.slice(0, 1200),
      done: false
    });
    taskBreakdowns[task.id] = breakdown;
    saveTaskBreakdowns();
    recordTaskBreakdownAiEvent(task, breakdown, "step_added", {
      event: { stepText: text.slice(0, 1200) }
    });
    renderTaskBreakdownSteps(task, modal, breakdown);
  });

  actions.className = "task-breakdown-result-actions";
  secondaryActions.className = "settings-actions task-breakdown-actions task-breakdown-secondary-actions";
  saveButton.className = "primary-button task-breakdown-save-button";
  saveButton.type = "button";
  saveButton.textContent = "Save";
  saveButton.addEventListener("click", () => {
    if (modal?.root) modal.root.taskBreakdownSaved = true;
    const existingHabit = habits.find((habit) => String(habit.id || "") === String(task.id || ""));
    if (!existingHabit) {
      habits = [{ ...task }, ...habits];
    }
    taskBreakdowns[task.id] = breakdown;
    saveTaskBreakdowns();
    saveHabits();
    render();
    closeTaskBreakdownModal(modal.root);
    showToast("Task saved.");
  });
  cancelButton.className = "text-button task-breakdown-cancel-button";
  cancelButton.type = "button";
  cancelButton.textContent = modal?.root?.taskBreakdownCancelDeletesTask ? "Cancel" : "Close";
  cancelButton.addEventListener("click", () => closeTaskBreakdownModal(modal.root, { cancel: true }));
  retakePhotoButton.className = "text-button";
  retakePhotoButton.type = "button";
  retakePhotoButton.textContent = "Retake photo";
  retakePhotoButton.addEventListener("click", () => renderTaskBreakdownRetakePhoto(task, modal, breakdown));
  helpfulButton.className = breakdown.feedback === "helpful" ? "primary-button" : "text-button";
  helpfulButton.type = "button";
  helpfulButton.textContent = "Helpful";
  helpfulButton.addEventListener("click", () => saveTaskBreakdownFeedback(task, modal, breakdown, "helpful"));
  notHelpfulButton.className = breakdown.feedback === "not_helpful" ? "primary-button" : "text-button";
  notHelpfulButton.type = "button";
  notHelpfulButton.textContent = "Not helpful";
  notHelpfulButton.addEventListener("click", () => saveTaskBreakdownFeedback(task, modal, breakdown, "not_helpful"));
  clearDoneButton.className = "text-button";
  clearDoneButton.type = "button";
  clearDoneButton.textContent = "Clear done";
  clearDoneButton.addEventListener("click", () => {
    breakdown.steps = breakdown.steps.filter((step) => !step.done);
    taskBreakdowns[task.id] = breakdown;
    saveTaskBreakdowns();
    renderTaskBreakdownSteps(task, modal, breakdown);
  });
  secondaryActions.append(retakePhotoButton);
  actions.append(secondaryActions, cancelButton, saveButton);
  modal.body.append(...[nameEditor, sourceCard, list, afterPhotoCard, addForm, actions].filter(Boolean));
  maybeRequestAutomaticTaskAfterImage(task, modal, breakdown);
}

function buildTaskBreakdownAfterPhotoCard(task, modal, breakdown) {
  const afterImageDataUrl = getTaskBreakdownAfterImageDataUrl(breakdown);
  const hasSourceImage = Boolean(String(breakdown?.sourceImageDataUrl || "").startsWith("data:image/"));
  const isPending = Boolean(breakdown?.targetImagePending);
  const error = String(breakdown?.targetImageError || "").trim();
  if (!hasSourceImage && !afterImageDataUrl && !isPending && !error) return null;

  const card = document.createElement("section");
  const label = document.createElement("p");
  const button = document.createElement("button");

  card.className = "task-breakdown-after-photo-card";
  label.className = "task-breakdown-source-label";
  label.textContent = "After";
  card.appendChild(label);
  if (afterImageDataUrl) {
    const image = document.createElement("img");
    image.src = afterImageDataUrl;
    image.alt = "After picture for this checklist";
    card.appendChild(image);
  } else {
    const pending = document.createElement("p");
    pending.className = isPending ? "task-breakdown-target-pending" : "task-breakdown-target-error";
    pending.textContent = isPending
      ? "After image is being made in the background. You can start now."
      : (error || "Make an optional after picture when you need a visual target.");
    card.appendChild(pending);
  }
  if (hasSourceImage && !afterImageDataUrl && !isPending) {
    button.className = "text-button";
    button.type = "button";
    button.textContent = error ? "Try after picture again" : "Make after picture";
    button.addEventListener("click", () => requestTaskTargetImage(task, modal, breakdown));
    card.appendChild(button);
  }
  return card;
}

function getTaskBreakdownAfterImageDataUrl(breakdown) {
  const manualAfterImage = String(breakdown?.afterImageDataUrl || "");
  if (manualAfterImage.startsWith("data:image/")) return manualAfterImage;
  const targetImage = String(breakdown?.targetImageDataUrl || "");
  return targetImage.startsWith("data:image/") ? targetImage : "";
}

function buildTaskBreakdownNameEditor(task, modal, breakdown) {
  const form = document.createElement("form");
  const label = document.createElement("label");
  const labelText = document.createElement("span");
  const input = document.createElement("input");
  const saveButton = document.createElement("button");

  form.className = "task-breakdown-name-editor";
  label.className = "field";
  labelText.textContent = "Task name";
  input.type = "text";
  input.maxLength = 80;
  input.placeholder = "Name this task";
  input.value = shouldShowEmptyTaskNameField(task, modal, breakdown)
    ? ""
    : String(task?.name || breakdown?.title || "").slice(0, 80);
  input.setAttribute("aria-label", "Task name");
  saveButton.className = "text-button";
  saveButton.type = "submit";
  saveButton.textContent = "Save name";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextName = input.value.replace(/\s+/g, " ").trim().slice(0, 80);
    if (!nextName) {
      input.focus();
      return;
    }
    const habit = habits.find((item) => String(item.id || "") === String(task.id || ""));
    if (habit) {
      habit.name = nextName;
      task.name = nextName;
      saveHabits();
    } else {
      task.name = nextName;
    }
    breakdown.title = nextName;
    taskBreakdowns[task.id] = breakdown;
    saveTaskBreakdowns();
    if (modal.eyebrow) modal.eyebrow.textContent = nextName;
    input.value = nextName;
    render();
    showToast("Task name saved.");
  });

  label.append(labelText, input);
  form.append(label, saveButton);
  return form;
}

function shouldShowEmptyTaskNameField(task, modal, breakdown) {
  if (!modal?.root?.taskBreakdownCancelDeletesTask) return false;
  const currentName = String(task?.name || "").replace(/\s+/g, " ").trim().toLowerCase();
  const currentTitle = String(breakdown?.title || "").replace(/\s+/g, " ").trim().toLowerCase();
  return currentName === "photo checklist"
    || currentTitle === "photo checklist"
    || currentName.endsWith(" photo checklist")
    || currentTitle.endsWith(" photo checklist");
}

function saveTaskBreakdownFeedback(task, modal, breakdown, feedback) {
  breakdown.feedback = feedback;
  taskBreakdowns[task.id] = breakdown;
  saveTaskBreakdowns();
  recordTaskBreakdownAiEvent(task, breakdown, "checklist_feedback", {
    event: { feedback }
  });
  renderTaskBreakdownSteps(task, modal, breakdown);
  showToast(feedback === "helpful" ? "Marked helpful." : "Marked not helpful.");
}

function recordTaskBreakdownAiEvent(task, breakdown, type, details = {}) {
  recordAiTrainingExample({
    type,
    task,
    checklist: breakdown,
    event: details.event || {},
    context: details.context || {}
  });
}

async function handleTaskBreakdownAfterPhoto(input, task, modal, breakdown) {
  const file = input.files?.[0];
  if (!file) return;
  if (!/^image\//i.test(file.type)) {
    showToast("Choose an image for the after photo.");
    input.value = "";
    return;
  }
  try {
    breakdown.afterImageDataUrl = await resizeTaskBreakdownImage(file, 900, 0.72);
    taskBreakdowns[task.id] = breakdown;
    saveTaskBreakdowns();
    recordTaskBreakdownAiEvent(task, breakdown, "after_photo_saved");
    if (modal?.body?.isConnected) {
      renderTaskBreakdownSteps(task, modal, breakdown);
    }
    showToast("After photo saved.");
  } catch {
    input.value = "";
    showToast("Could not save that after photo.");
  }
}

function renderTaskBreakdownRetakePhoto(task, modal, breakdown) {
  if (!modal?.body) return;
  if (modal.intro) modal.intro.textContent = "Update the message or photo, then send to recreate this checklist.";
  modal.body.textContent = "";
  const inputBox = buildTaskBreakdownDetailInput(task, modal);
  const actions = document.createElement("div");
  const sendButton = document.createElement("button");
  const backButton = document.createElement("button");
  if (modal.detailsInput && breakdown?.sourcePrompt) {
    modal.detailsInput.value = breakdown.sourcePrompt;
  }
  actions.className = "settings-actions task-breakdown-actions";
  sendButton.className = "primary-button";
  sendButton.type = "button";
  sendButton.textContent = "Recreate checklist";
  backButton.className = "text-button";
  backButton.type = "button";
  backButton.textContent = "Back to list";
  sendButton.addEventListener("click", () => generateTaskBreakdown(task, modal));
  backButton.addEventListener("click", () => renderTaskBreakdownSteps(task, modal, breakdown));
  actions.append(sendButton, backButton);
  modal.body.append(inputBox, actions);
  window.setTimeout(() => modal.issuePhotoInput?.click(), 120);
}

function autosizeTaskStepText(field) {
  if (!field) return;
  field.style.height = "0px";
  field.style.height = `${Math.max(field.scrollHeight + 8, 136)}px`;
}

function queueTaskStepAutosize(field) {
  window.requestAnimationFrame(() => {
    autosizeTaskStepText(field);
    window.requestAnimationFrame(() => autosizeTaskStepText(field));
  });
  window.setTimeout(() => autosizeTaskStepText(field), 160);
}

function buildTaskBreakdownSourceCard(breakdown) {
  const hasPrompt = Boolean(String(breakdown?.sourcePrompt || "").trim());
  const hasImage = Boolean(String(breakdown?.sourceImageDataUrl || "").startsWith("data:image/"));
  if (!hasPrompt && !hasImage) return null;

  const card = document.createElement("section");
  const toggle = document.createElement("button");
  const title = document.createElement("strong");
  const meta = document.createElement("span");
  const detail = document.createElement("div");

  card.className = "task-breakdown-source-card";
  toggle.className = "task-breakdown-source-toggle";
  toggle.type = "button";
  title.textContent = "Saved project history";
  meta.textContent = hasImage ? "Before photo saved" : "Checklist session saved";
  detail.className = "task-breakdown-source-detail";
  detail.hidden = !hasImage;
  card.classList.toggle("open", !detail.hidden);

  if (hasPrompt) {
    const prompt = document.createElement("p");
    prompt.textContent = breakdown.sourcePrompt;
    detail.appendChild(prompt);
  }
  if (hasImage) {
    const beforeLabel = document.createElement("p");
    const image = document.createElement("img");
    beforeLabel.className = "task-breakdown-source-label";
    beforeLabel.textContent = "Before";
    image.src = breakdown.sourceImageDataUrl;
    image.alt = "Photo submitted to AI";
    detail.append(beforeLabel, image);
  }
  const telemetryText = getTaskBreakdownTelemetryLabel(breakdown);
  if (telemetryText) {
    const telemetry = document.createElement("p");
    telemetry.className = "task-breakdown-telemetry";
    telemetry.textContent = telemetryText;
    detail.appendChild(telemetry);
  }
  toggle.append(title, meta);
  toggle.addEventListener("click", () => {
    const open = detail.hidden;
    detail.hidden = !open;
    card.classList.toggle("open", open);
  });
  card.append(toggle, detail);
  return card;
}

function getTaskBreakdownTelemetryLabel(breakdown) {
  const telemetry = normalizePhotoAiTelemetry(breakdown?.photoAiTelemetry);
  const parts = [];
  if (telemetry.uploadBytes) parts.push(`Upload ${Math.round(telemetry.uploadBytes / 1024)} KB`);
  if (telemetry.resizeMs) parts.push(`Resize ${(telemetry.resizeMs / 1000).toFixed(1)}s`);
  if (telemetry.checklistMs) parts.push(`Checklist ${(telemetry.checklistMs / 1000).toFixed(1)}s`);
  if (telemetry.afterImageMs) parts.push(`After ${(telemetry.afterImageMs / 1000).toFixed(1)}s`);
  return parts.join(" • ");
}

function openDayTaskDialog(dayName, dateKey) {
  const dayTasks = habits.filter((habit) => isTaskScheduledForDate(habit, dateKey));
  const modal = document.createElement("section");
  const panel = document.createElement("div");
  const heading = document.createElement("div");
  const titleWrap = document.createElement("div");
  const actions = document.createElement("div");
  const label = document.createElement("p");
  const title = document.createElement("h2");
  const printButton = document.createElement("button");
  const closeButton = document.createElement("button");
  const list = document.createElement("div");
  const footer = document.createElement("div");

  modal.className = "history-modal task-dialog";
  modal.setAttribute("aria-labelledby", "taskDialogTitle");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("role", "dialog");
  panel.className = "history-panel task-dialog-panel";
  heading.className = "section-heading";
  label.className = "eyebrow";
  label.textContent = "To-do list";
  title.id = "taskDialogTitle";
  title.textContent = dayName;
  actions.className = "task-dialog-actions";
  printButton.className = "text-button task-dialog-print";
  printButton.type = "button";
  printButton.textContent = "Print";
  closeButton.className = "delete-button";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close to-do list");
  closeButton.textContent = "x";
  list.className = "task-dialog-list";
  footer.className = "task-dialog-footer";

  titleWrap.append(label, title);
  actions.append(closeButton);
  heading.append(titleWrap, actions);
  footer.appendChild(printButton);

  if (dayTasks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "day-empty";
    empty.textContent = "No tasks for this day yet.";
    list.appendChild(empty);
  } else {
    dayTasks.forEach((task) => {
      const item = document.createElement("article");
      const itemText = document.createElement("div");
      const itemTitle = document.createElement("h3");
      const meta = document.createElement("p");
      const toggle = document.createElement("button");
      const done = task.completions.includes(dateKey);

      item.className = "task-dialog-item";
      item.classList.toggle("done", done);
      item.tabIndex = 0;
      item.setAttribute("role", "button");
      item.setAttribute("aria-label", `Open ${task.name} checklist and photos`);
      itemTitle.textContent = task.name;
      meta.textContent = [task.category || "General", task.priority || "Normal"].join(" / ");
      toggle.className = "text-button task-dialog-toggle";
      toggle.type = "button";
      toggle.textContent = done ? "Done" : "Mark done";
      toggle.addEventListener("click", () => {
        modal.remove();
        toggleHabit(task.id, dateKey);
      });
      item.addEventListener("click", (event) => {
        if (isTaskCardControl(event.target)) return;
        modal.remove();
        openTaskBreakdownDialog(task);
      });
      item.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        if (isTaskCardControl(event.target)) return;
        event.preventDefault();
        modal.remove();
        openTaskBreakdownDialog(task);
      });

      itemText.append(itemTitle, meta);
      item.append(itemText, toggle);
      list.appendChild(item);
    });
  }

  const close = () => modal.remove();
  printButton.addEventListener("click", () => printTaskDialog(dayName, dateKey, dayTasks));
  closeButton.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });

  panel.append(heading, list, footer);
  modal.appendChild(panel);
  document.body.appendChild(modal);
  closeButton.focus();
}

function showDailyAffirmation() {
  if (!appUnlocked) return;
  const lastShownDate = localStorage.getItem(affirmationShownStoreKey);
  const lowFocusOverride = shouldShowlowFocusAffirmation();
  if (lastShownDate === today && !lowFocusOverride) return;
  const index = getAffirmationIndex(today);
  affirmationText.textContent = dailyAffirmations[index];
  affirmationModal.hidden = false;
  affirmationModal.focus();
  localStorage.setItem(affirmationShownStoreKey, today);
  if (lowFocusOverride) {
    localStorage.setItem(affirmationlowFocusShownStoreKey, new Date().toISOString());
  }
}

function closeAffirmationModal() {
  affirmationModal.hidden = true;
}

function shouldShowlowFocusAffirmation() {
  if (!hasRecentlowFocusSignal()) return false;
  const lastShownAt = new Date(localStorage.getItem(affirmationlowFocusShownStoreKey) || 0).getTime();
  return !Number.isFinite(lastShownAt) || Date.now() - lastShownAt >= 4 * 60 * 60 * 1000;
}

function hasRecentlowFocusSignal() {
  const recentCutoff = getRecentCutoffKey(7);
  const recentfocusStateNotes = focusStateEntries
    .filter((entry) => entry.date >= recentCutoff)
    .map((entry) => `${entry.name || ""} ${entry.note || ""}`);
  const recentfocusLog = focusLogEntries
    .filter((entry) => entry.date >= recentCutoff)
    .map((entry) => entry.text || "");
  return [...recentfocusStateNotes, ...recentfocusLog].some((text) => matchesAnyPattern(text, lowFocusfocusStatePatterns));
}

function getAffirmationIndex(dateKey) {
  const dayNumber = Math.floor(parseDateKey(dateKey).getTime() / 86400000);
  return dayNumber % dailyAffirmations.length;
}

function getGoogleCalendarUrl(habit) {
  const start = getCalendarStart(habit.time || "Anytime");
  const taskDate = parseDateKey(getTaskDateKey(habit));
  start.setFullYear(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const details = [
    habit.note,
    `Date: ${formatarchiveBHistoryDate(getTaskDateKey(habit))}`,
    `Category: ${habit.category || "General"}`,
    `When: ${normalizeTaskPriority(habit.priority)}`,
    `Size: ${normalizeTaskSize(habit.size)}`,
    "Created from TaskLens AI."
  ].filter(Boolean).join("\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Task: ${habit.name}`,
    details,
    dates: `${toCalendarDateTime(start)}/${toCalendarDateTime(end)}`
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Use the textarea fallback below when clipboard permissions are blocked.
    }
  }

  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  return copied;
}

function printTaskDialog(dayName, dateKey, dayTasks) {
  const html = getTaskPrintHtml(dayName, dateKey, dayTasks);
  if (window.TaskLensPrint && typeof window.TaskLensPrint.printHtml === "function") {
    window.TaskLensPrint.printHtml(html, `${dayName} To-do list`);
    return;
  }

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => {
      printWindow.print();
    }, 250);
    return;
  }

  window.print();
}

function getTaskPrintHtml(dayName, dateKey, dayTasks) {
  const rows = dayTasks.length
    ? dayTasks.map((task) => {
      const done = task.completions.includes(dateKey);
      const meta = [
        task.category || "General",
        formatTaskDeadline(task.deadline),
        normalizeTaskPriority(task.priority),
        normalizeTaskSize(task.size)
      ].filter(Boolean).join(" / ");
      return `<li><span>${escapeHtml(task.name)}</span><small>${escapeHtml(meta)}</small><strong>${done ? "Done" : "Open"}</strong></li>`;
    }).join("")
    : "<li><span>No tasks for this day yet.</span></li>";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(dayName)} To-do list</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
    h1 { margin: 0 0 6px; font-size: 24px; }
    p { margin: 0 0 20px; color: #4b5563; }
    ul { list-style: none; margin: 0; padding: 0; }
    li { display: grid; grid-template-columns: 1fr auto; gap: 4px 16px; padding: 12px 0; border-bottom: 1px solid #d1d5db; }
    span { font-valueC: 700; }
    small { color: #4b5563; }
    strong { grid-row: 1 / span 2; grid-column: 2; align-self: center; }
  </style>
</head>
<body>
  <h1>${escapeHtml(dayName)} To-do list</h1>
  <p>${escapeHtml(dateKey)}</p>
  <ul>${rows}</ul>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCalendarStart(time) {
  const start = new Date();
  const clockTime = normalizeTaskTime(time);
  if (clockTime) {
    const [hours, minutes] = clockTime.split(":").map(Number);
    start.setHours(hours, minutes, 0, 0);
    return start;
  }

  const hourByTime = {
    Morning: 8,
    Afternoon: 13,
    Evening: 18,
    Night: 21,
    Anytime: 9
  };
  start.setHours(hourByTime[time] || 9, 0, 0, 0);
  return start;
}

function toCalendarDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

function isClockTime(value) {
  return /^\d{2}:\d{2}$/.test(String(value || ""));
}

function normalizeTaskTime(value) {
  const time = String(value || "").trim();
  if (isClockTime(time)) return time;
  const legacyTimes = {
    Morning: "08:00",
    Afternoon: "13:00",
    Evening: "18:00",
    Night: "21:00",
    Anytime: ""
  };
  return legacyTimes[time] || "";
}

function formatTaskDeadline(value) {
  const time = formatTaskTime(value);
  return time ? `Due ${time}` : "";
}

function formatTaskTime(value) {
  const time = normalizeTaskTime(value);
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function getTaskDay(habit) {
  return weekDays[parseDateKey(getTaskDateKey(habit)).getDay()];
}

function normalizeTaskDate(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function getTaskDateKey(habit) {
  if (normalizeTaskDate(habit?.date)) return habit.date;
  if (weekDays.includes(habit?.day)) return getWeekdayDateKey(weekDays.indexOf(habit.day));
  return today;
}

function isTaskScheduledForDate(habit, dateKey) {
  return getTaskDateKey(habit) === dateKey;
}

function getWeekdayDateKey(dayIndex, referenceDate = new Date()) {
  const date = new Date(referenceDate);
  const offset = dayIndex - date.getDay();
  date.setDate(date.getDate() + offset);
  return toDateKey(date);
}

function getRecentCutoffKey(days) {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days + 1);
  return toDateKey(cutoff);
}

function getDayCompletionPercent(dayHabits, dateKey) {
  if (!dayHabits.length) return 0;
  const complete = dayHabits.filter((habit) => habit.completions.includes(dateKey)).length;
  return Math.round((complete / dayHabits.length) * 100);
}

function getTaskStreak(habit, dateKey) {
  const completions = new Set(habit.completions);
  let streak = 0;
  const cursor = new Date(`${dateKey}T00:00:00`);

  while (completions.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }

  return streak;
}

function toggleHabit(id, dateKey) {
  habits = habits.map((habit) => {
    if (habit.id !== id) return habit;
    const completions = habit.completions.includes(dateKey)
      ? habit.completions.filter((date) => date !== dateKey)
      : [...habit.completions, dateKey];
    return { ...habit, completions };
  });

  saveHabits();
  render();
}

function deleteHabit(id) {
  habits = habits.filter((habit) => habit.id !== id);
  if (taskBreakdowns[id]) {
    const { [id]: _deletedBreakdown, ...remainingBreakdowns } = taskBreakdowns;
    taskBreakdowns = remainingBreakdowns;
    saveTaskBreakdowns();
  }
  saveHabits();
  render();
}

function getStreak(habit) {
  const completions = new Set(habit.completions);
  let streak = 0;
  const cursor = new Date();

  while (completions.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getRecentDays(count = 7) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - index));
    return {
      key: toDateKey(date),
      label: new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(date)
    };
  });
}

function renderGraph() {
  const { totalTasks, totalComplete, average } = getWeeklyTotals();

  graphAverage.textContent = `${average}%`;
  renderWeeklyTaskPercentBar(totalComplete, totalTasks, average);
}

function renderWeeklyTaskPercentBar(totalComplete, totalTasks, average) {
  if (!weeklyTaskPercentBar || !weeklyTaskPercentFill) return;
  const clampedAverage = Math.max(0, Math.min(100, average));
  weeklyTaskPercentFill.style.width = `${clampedAverage}%`;
  weeklyTaskPercentFill.textContent = `${average}%`;
  if (weeklyTaskPercentMeta) {
    weeklyTaskPercentMeta.textContent = `${totalComplete} of ${totalTasks} tasks completed`;
  }
  weeklyTaskPercentBar.setAttribute(
    "aria-label",
    totalTasks
      ? `Weekly task progress ${average}%, ${totalComplete} of ${totalTasks} tasks completed`
      : "Weekly task progress 0%, no weekly tasks scheduled"
  );
}

function getWeekStats() {
  return weekDays.map((dayName, index) => {
    const dateKey = getWeekdayDateKey(index);
    const dayHabits = habits.filter((habit) => isTaskScheduledForDate(habit, dateKey));
    const complete = dayHabits.filter((habit) => habit.completions.includes(dateKey)).length;
    const percent = dayHabits.length ? Math.round((complete / dayHabits.length) * 100) : 0;
    return {
      dayName,
      dayIndex: index,
      dateKey,
      complete,
      total: dayHabits.length,
      percent
    };
  });
}

function getCurrentWeekDateKeys() {
  return new Set(weekDays.map((_, index) => getWeekdayDateKey(index)));
}

function getCompletionDateKey(value) {
  const text = String(value || "").trim();
  const match = text.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function getWeeklyCompletionTotals() {
  const weekDateKeys = getCurrentWeekDateKeys();
  const weeklyTasks = habits.filter((habit) => weekDateKeys.has(getTaskDateKey(habit)));
  const totalTasks = weeklyTasks.length;
  const totalComplete = weeklyTasks.filter((habit) => (habit.completions || []).some((dateKey) => getCompletionDateKey(dateKey) === getTaskDateKey(habit))).length;
  const average = totalTasks ? Math.round((totalComplete / totalTasks) * 100) : 0;
  return { totalTasks, totalComplete, average };
}

function smoothPath(points) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].replace(",", " ")}`;

  const coordinates = points.map((point) => {
    const [x, y] = point.split(",").map(Number);
    return { x, y };
  });
  let path = `M ${coordinates[0].x.toFixed(1)} ${coordinates[0].y.toFixed(1)}`;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const current = coordinates[index];
    const next = coordinates[index + 1];
    const previous = coordinates[index - 1] || current;
    const after = coordinates[index + 2] || next;
    const control1X = current.x + (next.x - previous.x) / 6;
    const control1Y = current.y + (next.y - previous.y) / 6;
    const control2X = next.x - (after.x - current.x) / 6;
    const control2Y = next.y - (after.y - current.y) / 6;
    path += ` C ${control1X.toFixed(1)} ${control1Y.toFixed(1)}, ${control2X.toFixed(1)} ${control2Y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
  }

  return path;
}

function buildAreaPath(points, width, height, padding) {
  if (!points.length) return "";
  const linePath = smoothPath(points);
  return `${linePath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;
}

function getLinePoints(movement, step, padding, graphHeight, height, getValue, min, max) {
  const range = max - min || 1;
  return movement.map((day, index) => {
    const rawValue = getValue(day);
    const normalized = Number.isFinite(rawValue) ? (rawValue - min) / range : 0;
    const x = padding + index * step;
    const y = padding + graphHeight - normalized * graphHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
}

function createTableRow(cells) {
  const row = document.createElement("tr");
  cells.forEach((value) => {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.appendChild(cell);
  });
  return row;
}

function getLast24archiveAEntries() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return [...archiveAEntries]
    .map((entry) => ({ ...entry, dateTime: getEntryDateTime(entry, 12) }))
    .filter((entry) => entry.dateTime.getTime() >= cutoff)
    .sort((first, second) => second.dateTime - first.dateTime);
}

function renderarchiveA() {
  if (!avgvalueA || !avgvalueB || !latestvalueC || !latestphase || !latestvalueD || !latestreading || !latestWater) {
    return;
  }
  const last24Entries = getLast24archiveAEntries();
  const valueAValues = last24Entries.map((entry) => entry.valueA).filter(Number.isFinite);
  const valueBValues = last24Entries.map((entry) => entry.valueB).filter(Number.isFinite);
  const waterValues = last24Entries.map((entry) => entry.water).filter(Number.isFinite);
  const latestvalueCEntry = last24Entries.find((entry) => Number.isFinite(entry.valueC));
  const latestphaseEntry = last24Entries.find((entry) => entry.phasePhase);
  const latestvalueDEntry = last24Entries.find((entry) => Number.isFinite(entry.valueD));
  const latestreadingEntry = last24Entries.find(
    (entry) => Number.isFinite(entry.systolic) && Number.isFinite(entry.diastolic)
  );

  avgvalueA.textContent = valueAValues.length ? formatWholeNumber(getSum(valueAValues)) : "0";
  avgvalueB.textContent = valueBValues.length ? `${formatWholeNumber(getSum(valueBValues))}g` : "0g";
  latestvalueC.textContent = latestvalueCEntry ? `${formatDecimal(latestvalueCEntry.valueC)} lb` : "--";
  latestphase.textContent = latestphaseEntry ? formatphasePhase(latestphaseEntry.phasePhase) : "--";
  latestvalueD.textContent = latestvalueDEntry ? `${formatWholeNumber(latestvalueDEntry.valueD)}` : "--";
  latestreading.textContent = latestreadingEntry
    ? formatreading(latestreadingEntry.systolic, latestreadingEntry.diastolic, true)
    : "--";
  latestWater.textContent = waterValues.length ? `${formatWholeNumber(getSum(waterValues))} oz` : "0 oz";
  if (archiveARows && archiveAEmpty) {
    archiveARows.textContent = "";
    archiveAEmpty.hidden = last24Entries.length > 0;
    const fragment = document.createDocumentFragment();

    last24Entries.forEach((entry, index) => {
      const previousvalueC = findPreviousvalueC(last24Entries, index);
      const delta = Number.isFinite(entry.valueC) && Number.isFinite(previousvalueC)
        ? entry.valueC - previousvalueC
        : null;
      fragment.appendChild(createTableRow([
        formatEntryDateTime(entry.dateTime),
        Number.isFinite(entry.valueA) ? formatWholeNumber(entry.valueA) : "--",
        Number.isFinite(entry.valueB) ? `${formatWholeNumber(entry.valueB)}g` : "--",
        Number.isFinite(entry.valueC) ? `${formatDecimal(entry.valueC)} lb` : "--",
        formatphasePhase(entry.phasePhase),
        Number.isFinite(entry.valueD) ? `${formatWholeNumber(entry.valueD)}` : "--",
        formatreading(entry.systolic, entry.diastolic),
        Number.isFinite(entry.water) ? `${formatWholeNumber(entry.water)} oz` : "--",
        formatvalueCDelta(delta)
      ]));
    });
    archiveARows.appendChild(fragment);
  }

  if ((historyModal && !historyModal.hidden) || archiveCHistoryDropdown?.open) {
    renderHistory();
  }
}

function renderHistory() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (HISTORY_RETENTION_DAYS - 1));
  const historyEntries = archiveAEntries
    .filter((entry) => new Date(`${entry.date}T00:00:00`) >= start)
    .filter((entry) => (
      Number.isFinite(entry.valueC) ||
      Number.isFinite(entry.valueA) ||
      Number.isFinite(entry.valueB) ||
      entry.phasePhase ||
      Number.isFinite(entry.valueD) ||
      Number.isFinite(entry.systolic) ||
      Number.isFinite(entry.diastolic) ||
      Number.isFinite(entry.water)
    ))
    .sort((first, second) => second.date.localeCompare(first.date));

  if (historyRows) historyRows.textContent = "";
  if (historyEmpty) historyEmpty.hidden = historyEntries.length > 0;
  updateHistoryLegendButtons();
  renderHistoryChart(historyEntries);
  if (!historyRows) return;
  const fragment = document.createDocumentFragment();

  historyEntries.forEach((entry, index) => {
    const previousvalueC = findPreviousvalueC(historyEntries, index);
    const delta = Number.isFinite(entry.valueC) && Number.isFinite(previousvalueC)
      ? entry.valueC - previousvalueC
      : null;
    const row = createTableRow([
      formatEntryDate(entry.date),
      Number.isFinite(entry.valueA) ? formatWholeNumber(entry.valueA) : "--",
      Number.isFinite(entry.valueB) ? `${formatWholeNumber(entry.valueB)}g` : "--",
      Number.isFinite(entry.valueC) ? `${formatDecimal(entry.valueC)} lb` : "--",
      formatphasePhase(entry.phasePhase),
      Number.isFinite(entry.valueD) ? `${formatWholeNumber(entry.valueD)}` : "--",
      formatreading(entry.systolic, entry.diastolic),
      Number.isFinite(entry.water) ? `${formatWholeNumber(entry.water)} oz` : "--",
      formatvalueCDelta(delta)
    ]);
    row.dataset.historyDate = entry.date;
    if (entry.date === historyFocusDateKey) row.classList.add("history-row-focused");
    fragment.appendChild(row);
  });
  historyRows.appendChild(fragment);
}

function openMasterChart() {
  renderMasterChart();
  masterChartModal.hidden = false;
}

function renderMasterChart() {
  const rows = getMasterChartRows();
  masterChartRows.textContent = "";
  masterChartEmpty.hidden = rows.length > 0;
  masterChartRangeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String((Number(button.dataset.masterChartDays) || HISTORY_RETENTION_DAYS) === masterChartRangeDays));
  });
  const fragment = document.createDocumentFragment();

  rows.forEach((entry) => {
    const row = createTableRow([
      formatEntryDateTime(entry.dateTime),
      Number.isFinite(entry.valueA) ? formatWholeNumber(entry.valueA) : "--",
      Number.isFinite(entry.valueB) ? `${formatWholeNumber(entry.valueB)}g` : "--",
      Number.isFinite(entry.valueC) ? `${formatDecimal(entry.valueC)} lb` : "--",
      formatphasePhase(entry.phasePhase),
      Number.isFinite(entry.valueD) ? `${formatWholeNumber(entry.valueD)}` : "--",
      formatreading(entry.systolic, entry.diastolic),
      Number.isFinite(entry.water) ? `${formatWholeNumber(entry.water)} oz` : "--",
      entry.archiveB || "--",
      entry.severity || "--"
    ]);
    row.dataset.weekday = String(entry.dateTime.getDay());
    fragment.appendChild(row);
  });
  masterChartRows.appendChild(fragment);
}

function getMasterChartRows() {
  const cutoff = getRecentCutoffKey(masterChartRangeDays);
  const archiveARows = archiveAEntries
    .filter((entry) => entry.date >= cutoff)
    .map((entry) => ({ ...entry, dateTime: getEntryDateTime(entry, 12) }));
  const archiveBRows = archiveBEntries
    .filter((entry) => entry.date >= cutoff)
    .map((entry) => ({
      date: entry.date,
      dateTime: getEntryDateTime(entry, 15),
      archiveB: entry.name,
      severity: entry.severity
    }));
  return [...archiveARows, ...archiveBRows]
    .sort((first, second) => second.dateTime - first.dateTime);
}

function mountarchiveCHistoryChart() {
  if (!archiveCHistoryMount) {
    return;
  }

  const chartWrap = document.querySelector("#historyModal .history-chart-wrap");
  const tableWrap = document.querySelector("#historyModal .history-table-wrap");

  if (chartWrap && !archiveCHistoryMount.contains(chartWrap)) {
    archiveCHistoryMount.appendChild(chartWrap);
  }

  if (tableWrap && !archiveCHistoryMount.contains(tableWrap)) {
    archiveCHistoryMount.appendChild(tableWrap);
  }

  syncHistoryControls();
  renderHistory();
}

function renderHistoryChart(historyEntries) {
  const focusDate = parseDateKey(historyFocusDateKey);
  const todayEnd = parseDateKey(today);
  todayEnd.setHours(23, 59, 59, 999);
  const chartEnd = focusDate > todayEnd ? todayEnd : focusDate;
  chartEnd.setHours(23, 59, 59, 999);
  const chartStart = new Date(chartEnd);
  chartStart.setDate(chartStart.getDate() - Math.max(historyZoomDays - 1, 0));
  chartStart.setHours(0, 0, 0, 0);
  const chartItems = getHistoryChartItems(historyEntries)
    .filter((item) => item.dateTime >= chartStart && item.dateTime <= chartEnd)
    .sort((first, second) => first.dateTime - second.dateTime);
  const enabledKeys = getEnabledHistoryKeys();
  const hasChartData = chartItems.some((item) => (
    enabledKeys.some((key) => Number.isFinite(item[key]))
  ));

  historyChartEmpty.hidden = hasChartData;
  historyGrid.textContent = "";
  [0, 25, 50, 75, 100].forEach((value) => {
    const y = 20 + (1 - value / 100) * 170;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "40");
    line.setAttribute("x2", "616");
    line.setAttribute("y1", y.toFixed(1));
    line.setAttribute("y2", y.toFixed(1));
    historyGrid.appendChild(line);
  });

  renderHistoryAxis(chartStart, chartEnd);
  renderHistoryPoints(chartItems, chartStart, chartEnd, enabledKeys);
  updateHistoryZoomLabel();
  setHistoryLine(historyvalueCLine, chartItems, "valueC", chartStart, chartEnd, enabledKeys);
  setHistoryLine(historyvalueALine, chartItems, "valueA", chartStart, chartEnd, enabledKeys);
  setHistoryLine(historyvalueBLine, chartItems, "valueB", chartStart, chartEnd, enabledKeys);
  setHistoryLine(historyvalueDLine, chartItems, "valueD", chartStart, chartEnd, enabledKeys);
  setHistoryLine(historyPressureLine, chartItems, "pressure", chartStart, chartEnd, enabledKeys);
  setHistoryLine(historyWaterLine, chartItems, "water", chartStart, chartEnd, enabledKeys);
}

function getHistoryChartItems(historyEntries) {
  return historyEntries.map((entry) => ({
    date: entry.date,
    dateTime: getEntryDateTime(entry, 12),
    valueC: entry.valueC,
    valueA: entry.valueA,
    valueB: entry.valueB,
    valueD: entry.valueD,
    systolic: entry.systolic,
    diastolic: entry.diastolic,
    pressure: Number.isFinite(entry.systolic) ? entry.systolic : entry.diastolic,
    water: entry.water
  }));
}

function setHistoryLine(line, items, key, startDate, endDate, enabledKeys) {
  if (!line) return;
  line.setAttribute("d", enabledKeys.includes(key) ? getHistoryPath(items, key, startDate, endDate) : "");
}

function renderHistoryAxis(startDate, endDate) {
  getHistoryAxisTicks(startDate, endDate).forEach((tick) => {
    const x = getHistoryX(tick.date, startDate, endDate);
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "line");
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    marker.setAttribute("x1", x.toFixed(1));
    marker.setAttribute("x2", x.toFixed(1));
    marker.setAttribute("y1", "190");
    marker.setAttribute("y2", "198");
    label.setAttribute("x", x.toFixed(1));
    label.setAttribute("y", "218");
    label.setAttribute("text-anchor", tick.anchor || "middle");
    label.textContent = tick.label;
    historyGrid.append(marker, label);
  });
}

function getHistoryAxisTicks(startDate, endDate) {
  const visibleDays = Math.max(Math.ceil((endDate - startDate) / 86400000), 1);
  if (visibleDays <= 2) {
    const ticks = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      ticks.push({ date: new Date(cursor), label: formatHistoryAxisDateTime(cursor) });
      cursor.setHours(cursor.getHours() + 6);
    }
    ticks.push({ date: new Date(endDate), label: formatHistoryAxisDateTime(endDate), anchor: "end" });
    return ticks;
  }
  if (visibleDays <= 45) {
    const step = visibleDays <= 8 ? 1 : 7;
    const ticks = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      ticks.push({ date: new Date(cursor), label: formatHistoryAxisDate(cursor) });
      cursor.setDate(cursor.getDate() + step);
    }
    if (ticks.length === 0 || toDateKey(ticks[ticks.length - 1].date) !== toDateKey(endDate)) {
      ticks.push({ date: new Date(endDate), label: formatHistoryAxisDate(endDate), anchor: "end" });
    }
    return ticks;
  }

  const ticks = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  if (cursor < startDate) {
    cursor.setMonth(cursor.getMonth() + 1);
  }
  while (cursor <= endDate) {
    ticks.push({ date: new Date(cursor), label: new Intl.DateTimeFormat(undefined, { month: "short" }).format(cursor) });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  if (!ticks.length) {
    ticks.push({ date: new Date(startDate), label: formatHistoryAxisDate(startDate) });
  }
  return ticks;
}

function formatHistoryAxisDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatHistoryAxisDateTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatClockTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatEntryDateTime(date) {
  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit"
  }).format(date);
  const timePart = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
  return `${datePart} ${timePart}`;
}

function updateHistoryZoomLabel() {
  if (historyZoomLabel) {
    historyZoomLabel.textContent = historyZoomDays >= HISTORY_RETENTION_DAYS
      ? "10 years"
      : historyZoomDays === 365
        ? "1 year"
        : historyZoomDays === 1
          ? "1 day"
          : `${historyZoomDays} days`;
  }
}

function syncHistoryControls() {
  historyFocusDateKey = historyFocusDate.value || historyFocusDateKey || today;
  historyZoomDays = Number(historyZoomRange.value) || historyZoomDays || HISTORY_RETENTION_DAYS;
  historyFocusDate.value = historyFocusDateKey;
  historyFocusDate.max = today;
  historyZoomRange.value = String(historyZoomDays);
  updateHistoryZoomLabel();
}

function getHistoryPath(items, key, startDate, endDate) {
  const values = items.map((item) => item[key]).filter(Number.isFinite);
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const usableItems = items.map((item) => ({ value: item[key], date: item.dateTime || parseDateKey(item.date) })).filter((item) => Number.isFinite(item.value));

  return usableItems.map((item, pathIndex) => {
    const x = getHistoryX(item.date, startDate, endDate);
    const y = 20 + (1 - (item.value - min) / range) * 170;
    return `${pathIndex === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

function renderHistoryPoints(items, startDate, endDate, enabledKeys) {
  const fragment = document.createDocumentFragment();
  enabledKeys.forEach((key) => {
    const values = items.map((item) => item[key]).filter(Number.isFinite);
    if (!values.length) return;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    items.forEach((item) => {
      if (!Number.isFinite(item[key])) return;
      const point = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      const itemDateKey = item.date || toDateKey(item.dateTime || new Date());
      point.setAttribute("class", `history-point history-${key}-point${itemDateKey === historyFocusDateKey ? " is-selected" : ""}`);
      point.setAttribute("cx", getHistoryX(item.dateTime || parseDateKey(item.date), startDate, endDate).toFixed(1));
      point.setAttribute("cy", (20 + (1 - (item[key] - min) / range) * 170).toFixed(1));
      point.setAttribute("r", "4");
      point.setAttribute("role", "link");
      point.setAttribute("tabindex", "0");
      point.setAttribute("aria-label", getHistoryPointLabel(item, key));
      point.addEventListener("click", () => selectHistoryPoint(item, key));
      point.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectHistoryPoint(item, key);
        }
      });
      fragment.appendChild(point);
    });
  });
  historyGrid.appendChild(fragment);
}

function selectHistoryPoint(item, key) {
  const dateKey = item.date || toDateKey(item.dateTime || new Date());
  historyFocusDateKey = dateKey;
  historyFocusDate.value = dateKey;
  const filterValue = getHistoryFilterForKey(key);
  if (filterValue && historyMetricFilter) historyMetricFilter.value = filterValue;
  renderHistory();
  window.requestAnimationFrame(() => {
    if (!historyRows) return;
    const row = Array.from(historyRows.querySelectorAll("[data-history-date]"))
      .find((item) => item.dataset.historyDate === dateKey);
    row?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  });
}

function getHistoryFilterForKey(key) {
  if (["valueA", "valueB", "valueC", "valueD", "pressure", "water"].includes(key)) return key;
  if (key === "water") return "water";
  return "all";
}

function getHistoryPointLabel(item, key) {
  const labels = {
    valueC: "valueC",
    valueA: "valueA",
    valueB: "valueB",
    valueD: "Reading",
    pressure: "Pressure",
    water: "Water"
  };
  const value = key === "pressure"
    ? formatreading(item.systolic, item.diastolic)
    : formatHistoryPointValue(key, item[key]);
  return `${labels[key] || key}: ${value} on ${formatEntryDate(item.date)}`;
}

function formatHistoryPointValue(key, value) {
  if (!Number.isFinite(value)) return "--";
  if (key === "valueC") return `${formatDecimal(value)} lb`;
  if (key === "valueB") return `${formatWholeNumber(value)}g`;
  if (key === "valueD") return `${formatWholeNumber(value)}`;
  if (key === "water") return `${formatWholeNumber(value)} oz`;
  return formatWholeNumber(value);
}

function getEnabledHistoryKeys() {
  const filterValue = historyMetricFilter.value || "all";
  if (filterValue === "archiveA") return ["valueA", "valueB", "valueC"];
  if (filterValue === "archiveC") return ["valueD", "pressure", "valueC"];
  if (["valueA", "valueB", "valueC", "valueD", "pressure", "water"].includes(filterValue)) return [filterValue];
  if (filterValue === "water") return ["water"];
  return ["valueC", "valueA", "valueB", "valueD", "pressure", "water"];
}

function updateHistoryLegendButtons() {
  const filterValue = historyMetricFilter.value || "all";
  const enabledKeys = getEnabledHistoryKeys();
  historyLegendButtons.forEach((button) => {
    const metric = button.dataset.historyMetric || "";
    const isActive = filterValue === "all" || enabledKeys.includes(metric);
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function getHistoryX(date, startDate, endDate) {
  const range = Math.max(endDate - startDate, 1);
  return 40 + ((date - startDate) / range) * 576;
}

function getEntryDateTime(entry, fallbackHour = 12) {
  const recorded = entry?.recordedAt ? new Date(entry.recordedAt) : null;
  const date = parseDateKey(entry?.date || today);
  if (recorded && !Number.isNaN(recorded.getTime())) {
    date.setHours(recorded.getHours(), recorded.getMinutes(), recorded.getSeconds(), recorded.getMilliseconds());
    return date;
  }
  date.setHours(fallbackHour, 0, 0, 0);
  return date;
}

function getarchiveBeverityScore(severity) {
  if (severity === "Severe") return 3;
  if (severity === "Moderate") return 2;
  return 1;
}


function renderWaterControl() {
  if (!waterGlasses || !water || !waterCount || !waterToggle) return;
  if (!waterGlasses.children.length) {
    const fragment = document.createDocumentFragment();
    for (let index = 1; index <= WATER_GLASS_COUNT; index += 1) {
      const button = document.createElement("button");
      const label = document.createElement("span");

      button.type = "button";
      button.className = "water-glass";
      button.dataset.glassIndex = String(index);
      button.setAttribute("aria-label", `${index} glass${index === 1 ? "" : "es"}, ${index * WATER_GLASS_OZ} ounces`);
      label.textContent = String(index);
      button.appendChild(label);
      fragment.appendChild(button);
    }
    waterGlasses.appendChild(fragment);
  }

  const ounces = parsearchiveANumber(water.value);
  const selectedGlasses = Number.isFinite(ounces) ? Math.max(0, Math.min(WATER_GLASS_COUNT, Math.round(ounces / WATER_GLASS_OZ))) : 0;
  const visibleGlasses = WATER_GLASS_COUNT;

  waterCount.textContent = Number.isFinite(ounces) ? formatWholeNumber(ounces) : "0";
  waterToggle.setAttribute("aria-expanded", "true");
  waterGlasses.classList.add("expanded");
  waterGlasses.classList.remove("collapsed");
  waterGlasses.querySelectorAll(".water-glass").forEach((button, index) => {
    button.hidden = index >= visibleGlasses;
    const active = index < selectedGlasses;
    button.classList.toggle("active", active);
    button.style.setProperty("--fill", active ? "100%" : "0%");
  });
}

function setWaterExpanded(expanded) {
  waterExpanded = Boolean(expanded);
  renderWaterControl();
}

function setWaterAmount(ounces) {
  water.value = Number.isFinite(ounces) && ounces > 0 ? String(ounces) : "";
  renderWaterControl();
}

function findPreviousvalueC(entries, currentIndex) {
  const olderEntries = entries.slice(currentIndex + 1);
  const previous = olderEntries.find((entry) => Number.isFinite(entry.valueC));
  return previous ? previous.valueC : null;
}

function parsearchiveANumber(value) {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getAverage(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getSum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function formatWholeNumber(value) {
  return wholeNumberFormatter.format(value);
}

function formatDecimal(value) {
  return decimalFormatter.format(value);
}

function formatInputDecimal(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "";
}

function formatvalueCDelta(value) {
  if (!Number.isFinite(value)) return "--";
  if (Math.abs(value) < 0.05) return "0.0 lb";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatDecimal(value)} lb`;
}

function formatEntryDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatShortSlashDate(dateKey) {
  const date = parseDateKey(dateKey);
  return [
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getFullYear()).slice(-2)
  ].join("/");
}

function updatefocusLogEntryState() {
  if (!focusLogEntry) return;
  focusLogEntry.closest(".focusLog-entry-field")?.classList.toggle("has-entry", Boolean(focusLogEntry.value.trim()));
}

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

function daysBetween(dateKey, compareDateKey) {
  return Math.abs(Math.round((parseDateKey(compareDateKey) - parseDateKey(dateKey)) / 86400000));
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createHabitId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadHabits() {
  try {
    const saved = JSON.parse(localStorage.getItem(storeKey));
    return Array.isArray(saved)
      ? saved
        .filter((habit) => habit && habit.name)
        .filter((habit) => !isLegacyStarterWalkTask(habit))
        .map((habit) => ({
          id: habit.id || String(Date.now()),
          name: habit.name,
          date: normalizeTaskDate(habit.date)
            || (weekDays.includes(habit.day) ? getWeekdayDateKey(weekDays.indexOf(habit.day)) : today),
          day: weekDays.includes(habit.day)
            ? habit.day
            : weekDays[new Date().getDay()],
          category: habit.category || "General",
          time: normalizeTaskTime(habit.time),
          deadline: normalizeTaskTime(habit.deadline),
          priority: normalizeTaskPriority(habit.priority),
          size: normalizeTaskSize(habit.size),
          color: habit.color || "#f97316",
          note: habit.note || "",
          completions: Array.isArray(habit.completions)
            ? habit.completions.filter((date) => typeof date === "string")
            : []
        }))
      : [];
  } catch {
    return [];
  }
}

function isLegacyStarterWalkTask(habit) {
  const name = String(habit?.name || "").trim().toLowerCase();
  return name === "walk for 10 minutes"
    && !normalizeTaskTime(habit?.deadline)
    && !normalizeTaskTime(habit?.time)
    && !String(habit?.note || "").trim()
    && (!Array.isArray(habit?.completions) || habit.completions.length === 0);
}

function saveHabits() {
  localStorage.setItem(storeKey, JSON.stringify(habits));
}

function createTaskDraft(options = {}) {
  const dayName = options.day || weekDays[new Date().getDay()];
  const name = String(options.name || "New task").replace(/\s+/g, " ").trim().slice(0, 80) || "New task";
  return {
    id: options.id || createHabitId(),
    name,
    date: options.date || today,
    day: dayName,
    category: String(options.category || "General").slice(0, 40),
    time: normalizeTaskTime(options.time || ""),
    deadline: normalizeTaskTime(options.deadline || ""),
    priority: normalizeTaskPriority(options.priority || "Next"),
    size: normalizeTaskSize(options.size || "Small"),
    color: /^#[0-9a-f]{6}$/i.test(options.color || "") ? options.color : "#4574fa",
    note: String(options.note || "").trim().slice(0, 1200),
    completions: Array.isArray(options.completions) ? options.completions : []
  };
}

function loadTaskBreakdowns() {
  try {
    const savedText = localStorage.getItem(taskBreakdownsStoreKey)
      || localStorage.getItem(legacyTaskBreakdownsStoreKey)
      || "{}";
    const saved = JSON.parse(savedText);
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
    return Object.fromEntries(Object.entries(saved)
      .filter(([taskId, breakdown]) => taskId && breakdown && Array.isArray(breakdown.steps))
      .map(([taskId, breakdown]) => [taskId, {
        title: String(breakdown.title || "").slice(0, 80),
        summary: String(breakdown.summary || "").slice(0, 300),
        generatedAt: breakdown.generatedAt || new Date().toISOString(),
        sourcePrompt: String(breakdown.sourcePrompt || "").slice(0, 1600),
        feedback: ["helpful", "not_helpful"].includes(breakdown.feedback) ? breakdown.feedback : "",
        sourceImageDataUrl: String(breakdown.sourceImageDataUrl || "").startsWith("data:image/")
          ? String(breakdown.sourceImageDataUrl).slice(0, 2200000)
          : "",
        photoAiTelemetry: normalizePhotoAiTelemetry(breakdown.photoAiTelemetry),
        targetImageDataUrl: String(breakdown.targetImageDataUrl || "").startsWith("data:image/")
          ? String(breakdown.targetImageDataUrl).slice(0, 2200000)
          : "",
        targetImageError: String(breakdown.targetImageError || "").slice(0, 180),
        afterImageDataUrl: String(breakdown.afterImageDataUrl || "").startsWith("data:image/")
          ? String(breakdown.afterImageDataUrl).slice(0, 1200000)
          : "",
        steps: breakdown.steps
          .filter((step) => step && String(step.text || "").trim())
          .slice(0, 12)
          .map((step, index) => ({
            id: step.id || `${taskId}:step:${index}`,
            text: String(step.text || "").trim().slice(0, 1200),
            done: Boolean(step.done)
          }))
      }]));
  } catch {
    return {};
  }
}

function saveTaskBreakdowns() {
  localStorage.setItem(taskBreakdownsStoreKey, JSON.stringify(taskBreakdowns));
}

function normalizePhotoAiTelemetry(value) {
  const telemetry = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    uploadBytes: Math.max(0, Math.round(Number(telemetry.uploadBytes) || 0)),
    resizeMs: Math.max(0, Math.round(Number(telemetry.resizeMs) || 0)),
    checklistMs: Math.max(0, Math.round(Number(telemetry.checklistMs) || 0)),
    afterImageMs: Math.max(0, Math.round(Number(telemetry.afterImageMs) || 0)),
    checklistStatus: String(telemetry.checklistStatus || "").slice(0, 40),
    afterImageStatus: String(telemetry.afterImageStatus || "").slice(0, 40),
    recordedAt: telemetry.recordedAt || ""
  };
}

function loadAiTrainingExamples() {
  try {
    const saved = JSON.parse(localStorage.getItem(aiTrainingExamplesStoreKey) || "[]");
    return Array.isArray(saved)
      ? saved
        .filter((example) => example && typeof example === "object")
        .slice(-500)
        .map((example) => ({
          schemaVersion: 1,
          type: String(example.type || "event").slice(0, 60),
          recordedAt: example.recordedAt || new Date().toISOString(),
          task: normalizeTrainingTaskSnapshot(example.task),
          checklist: normalizeTrainingChecklistSnapshot(example.checklist),
          event: normalizeTrainingEventSnapshot(example.event),
          context: normalizeTrainingContextSnapshot(example.context)
        }))
      : [];
  } catch {
    return [];
  }
}

function saveAiTrainingExamples() {
  localStorage.setItem(aiTrainingExamplesStoreKey, JSON.stringify(aiTrainingExamples.slice(-500)));
}

function recordAiTrainingExample(example) {
  if (!example || typeof example !== "object") return;
  aiTrainingExamples = [...aiTrainingExamples, {
    schemaVersion: 1,
    type: String(example.type || "event").slice(0, 60),
    recordedAt: new Date().toISOString(),
    task: normalizeTrainingTaskSnapshot(example.task),
    checklist: normalizeTrainingChecklistSnapshot(example.checklist),
    event: normalizeTrainingEventSnapshot(example.event),
    context: normalizeTrainingContextSnapshot(example.context)
  }].slice(-500);
  saveAiTrainingExamples();
}

function normalizeTrainingTaskSnapshot(task) {
  return {
    id: String(task?.id || "").slice(0, 80),
    name: String(task?.name || "").slice(0, 160),
    date: normalizeTaskDate(task?.date),
    deadline: normalizeTaskTime(task?.deadline),
    category: String(task?.category || "General").slice(0, 80),
    priority: normalizeTaskPriority(task?.priority),
    size: normalizeTaskSize(task?.size),
    note: String(task?.note || "").slice(0, 800)
  };
}

function normalizeTrainingChecklistSnapshot(breakdown) {
  return {
    title: String(breakdown?.title || "").slice(0, 120),
    summary: String(breakdown?.summary || "").slice(0, 500),
    generatedAt: String(breakdown?.generatedAt || "").slice(0, 40),
    sourcePrompt: String(breakdown?.sourcePrompt || "").slice(0, 1600),
    feedback: ["helpful", "not_helpful"].includes(breakdown?.feedback) ? breakdown.feedback : "",
    hasBeforePhoto: Boolean(String(breakdown?.sourceImageDataUrl || "").startsWith("data:image/")),
    hasTargetImage: Boolean(String(breakdown?.targetImageDataUrl || "").startsWith("data:image/")),
    hasAfterPhoto: Boolean(String(breakdown?.afterImageDataUrl || "").startsWith("data:image/")),
    beforePhotoBytesApprox: getDataUrlApproxByteLength(breakdown?.sourceImageDataUrl),
    targetImageBytesApprox: getDataUrlApproxByteLength(breakdown?.targetImageDataUrl),
    afterPhotoBytesApprox: getDataUrlApproxByteLength(breakdown?.afterImageDataUrl),
    steps: Array.isArray(breakdown?.steps)
      ? breakdown.steps.slice(0, 20).map((step, index) => ({
        id: String(step?.id || `step:${index}`).slice(0, 120),
        text: String(step?.text || "").slice(0, 1200),
        done: Boolean(step?.done)
      }))
      : []
  };
}

function normalizeTrainingEventSnapshot(event) {
  return {
    stepId: String(event?.stepId || "").slice(0, 120),
    previousText: String(event?.previousText || "").slice(0, 1200),
    newText: String(event?.newText || "").slice(0, 1200),
    stepText: String(event?.stepText || "").slice(0, 1200),
    feedback: ["helpful", "not_helpful"].includes(event?.feedback) ? event.feedback : "",
    regenerated: Boolean(event?.regenerated),
    completed: typeof event?.completed === "boolean" ? event.completed : null
  };
}

function normalizeTrainingContextSnapshot(context) {
  return {
    source: String(context?.source || "").slice(0, 80),
    model: String(context?.model || "").slice(0, 80),
    hadPhotoUpload: Boolean(context?.hadPhotoUpload)
  };
}

function getDataUrlApproxByteLength(dataUrl) {
  const value = String(dataUrl || "");
  if (!value.startsWith("data:image/")) return 0;
  const body = value.split(",")[1] || "";
  return Math.round((body.length * 3) / 4);
}

function loadDeadlineAlertKeys() {
  try {
    const saved = JSON.parse(localStorage.getItem(deadlineAlertStoreKey));
    return new Set(Array.isArray(saved) ? saved.filter((key) => typeof key === "string") : []);
  } catch {
    return new Set();
  }
}

function saveDeadlineAlertKeys() {
  localStorage.setItem(deadlineAlertStoreKey, JSON.stringify([...deadlineAlertKeys].slice(-500)));
}

function loadTaskDeadlineEvents() {
  try {
    const saved = JSON.parse(localStorage.getItem(deadlineEventStoreKey));
    return Array.isArray(saved)
      ? saved
        .filter((event) => event && event.taskId && event.date && event.deadline)
        .map((event) => ({
          taskId: event.taskId,
          taskName: event.taskName || "Task",
          date: event.date,
          deadline: normalizeTaskTime(event.deadline),
          recordedAt: event.recordedAt || new Date().toISOString()
        }))
        .filter((event) => event.date >= getRecentCutoffKey(HISTORY_RETENTION_DAYS))
      : [];
  } catch {
    return [];
  }
}

function saveTaskDeadlineEvents() {
  taskDeadlineEvents = taskDeadlineEvents
    .filter((event) => event.date >= getRecentCutoffKey(HISTORY_RETENTION_DAYS))
    .sort((first, second) => second.date.localeCompare(first.date));
  localStorage.setItem(deadlineEventStoreKey, JSON.stringify(taskDeadlineEvents));
}

function loadarchiveAEntries() {
  try {
    const saved = JSON.parse(localStorage.getItem(archiveAStoreKey));
    return Array.isArray(saved)
      ? saved
        .filter((entry) => entry && entry.date)
        .map((entry) => ({
          date: entry.date,
          recordedAt: entry.recordedAt || `${entry.date}T12:00:00`,
          valueA: Number.isFinite(entry.valueA) ? entry.valueA : null,
          valueB: Number.isFinite(entry.valueB) ? entry.valueB : null,
          valueC: Number.isFinite(entry.valueC) ? entry.valueC : null,
          phasePhase: typeof entry.phasePhase === "string" && entry.phasePhase ? entry.phasePhase : null,
          valueD: Number.isFinite(entry.valueD) ? entry.valueD : null,
          systolic: Number.isFinite(entry.systolic) ? entry.systolic : null,
          diastolic: Number.isFinite(entry.diastolic) ? entry.diastolic : null,
          water: Number.isFinite(entry.water) ? entry.water : null
        }))
        .sort((first, second) => second.date.localeCompare(first.date))
      : [];
  } catch {
    return [];
  }
}

function savearchiveAEntries() {
  localStorage.setItem(archiveAStoreKey, JSON.stringify(archiveAEntries));
}

function loadarchiveBEntries() {
  try {
    const saved = JSON.parse(localStorage.getItem(archiveBtoreKey));
    return Array.isArray(saved)
      ? saved.filter((entry) => entry && entry.name && entry.date).map((entry) => ({
        id: entry.id || createHabitId(),
        date: entry.date,
        recordedAt: entry.recordedAt || `${entry.date}T15:00:00`,
        name: entry.name,
        severity: entry.severity || "Mild",
        note: entry.note || ""
      })).filter((entry) => entry.date >= getarchiveBHistoryCutoffKey()).sort((first, second) => second.date.localeCompare(first.date))
      : [];
  } catch {
    return [];
  }
}

function savearchiveBEntries() {
  archiveBEntries = archiveBEntries
    .filter((entry) => entry && entry.name && entry.date && entry.date >= getarchiveBHistoryCutoffKey())
    .sort((first, second) => second.date.localeCompare(first.date));
  localStorage.setItem(archiveBtoreKey, JSON.stringify(archiveBEntries));
}

function loadfocusStateEntries() {
  try {
    const saved = JSON.parse(localStorage.getItem(focusStateStoreKey));
    return Array.isArray(saved)
      ? saved.filter((entry) => entry && entry.name && entry.date).map((entry) => ({
        id: entry.id || createHabitId(),
        date: entry.date,
        recordedAt: entry.recordedAt || `${entry.date}T18:00:00`,
        name: entry.name,
        intensity: entry.intensity || "Moderate",
        note: entry.note || ""
      })).filter((entry) => entry.date >= getarchiveBHistoryCutoffKey()).sort((first, second) => second.date.localeCompare(first.date))
      : [];
  } catch {
    return [];
  }
}

function savefocusStateEntries() {
  focusStateEntries = focusStateEntries
    .filter((entry) => entry && entry.name && entry.date && entry.date >= getarchiveBHistoryCutoffKey())
    .sort((first, second) => second.date.localeCompare(first.date));
  localStorage.setItem(focusStateStoreKey, JSON.stringify(focusStateEntries));
}

function loadfocusLogEntries() {
  const entries = [];
  const seen = new Set();
  const deletedKeys = loadDeletedfocusLogEntryKeys();
  const addEntries = (saved) => {
    if (!Array.isArray(saved)) return;
    saved.forEach((entry) => {
      const normalized = normalizeStoredfocusLogEntry(entry);
      if (!normalized) return;
      const key = `${normalized.date}:${normalized.text}`;
      if (deletedKeys.has(key)) return;
      if (seen.has(key)) return;
      seen.add(key);
      entries.push(normalized);
    });
  };
  [
    focusLogStoreKey,
    "habit-tracker:focusLog:v1",
    "habit-tracker:focusLog",
    "focusLogEntries"
  ].forEach((key) => addEntries(readStoredArray(key)));

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index) || "";
    const saved = readStoredValue(key);
    if (/focusLog/i.test(key)) {
      addEntries(Array.isArray(saved) ? saved : extractfocusLogEntriesFromStoredValue(saved));
    } else if (/dictation|backup|export|habit-tracker|tasklens-ai/i.test(key)) {
      addEntries(extractfocusLogEntriesFromStoredValue(saved));
    }
  }
  const sorted = entries
    .filter((entry) => entry.date >= getarchiveBHistoryCutoffKey())
    .sort((first, second) => second.date.localeCompare(first.date));
  if (sorted.length) localStorage.setItem(focusLogStoreKey, JSON.stringify(sorted));
  return sorted;
}

function readStoredArray(key) {
  const saved = readStoredValue(key);
  return Array.isArray(saved) ? saved : [];
}

function readStoredValue(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function extractfocusLogEntriesFromStoredValue(value) {
  const found = [];
  const visit = (node, fallbackDate = "") => {
    if (!node) return;
    if (typeof node === "string") {
      const entry = normalizeStoredfocusLogEntry({ date: fallbackDate, text: node }, fallbackDate);
      if (entry) found.push(entry);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child) => visit(child, fallbackDate));
      return;
    }
    if (typeof node !== "object") return;
    const entry = normalizeStoredfocusLogEntry(node, fallbackDate);
    if (entry && (node.text || node.entry || node.body || /focusLog/i.test(String(node.section || node.type || node.source || "")))) {
      found.push(entry);
    }
    Object.entries(node).forEach(([key, child]) => {
      const dateKey = getStoredfocusLogDateKey(key) || fallbackDate;
      if (/focusLog/i.test(key) || key === "focusLogEntries" || dateKey) visit(child, dateKey);
    });
  };
  visit(value);
  return found;
}

function normalizeStoredfocusLogEntry(entry, fallbackDate = "") {
  if (!entry) return null;
  if (typeof entry === "string") {
    entry = { date: fallbackDate, text: entry };
  }
  const date = getStoredfocusLogDateKey(
    entry.date ||
    entry.dateKey ||
    entry.createdAt ||
    entry.recordedAt ||
    entry.timestamp ||
    fallbackDate
  );
  if (!date) return null;
  const text = String(
    (entry.focusLog && typeof entry.focusLog === "object" ? entry.focusLog.text : "") ||
    entry.text ||
    entry.entry ||
    (typeof entry.focusLog === "string" ? entry.focusLog : "") ||
    entry.body ||
    entry.note ||
    ""
  ).trim();
  if (!text) return null;
  return {
    id: entry.id || createHabitId(),
    date,
    text
  };
}

function getStoredfocusLogDateKey(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const dateKey = raw.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (dateKey) return dateKey;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : toDateKey(date);
}

function savefocusLogEntries() {
  focusLogEntries = focusLogEntries
    .filter((entry) => entry && entry.date && entry.text && entry.date >= getarchiveBHistoryCutoffKey())
    .sort((first, second) => second.date.localeCompare(first.date));
  localStorage.setItem(focusLogStoreKey, JSON.stringify(focusLogEntries));
}

function loadDeletedfocusLogEntryKeys() {
  try {
    const saved = JSON.parse(localStorage.getItem(deletedfocusLogEntriesStoreKey) || "[]");
    return new Set(Array.isArray(saved) ? saved.filter((key) => typeof key === "string") : []);
  } catch {
    return new Set();
  }
}

function saveDeletedfocusLogEntryKeys(keys) {
  localStorage.setItem(deletedfocusLogEntriesStoreKey, JSON.stringify([...keys].slice(-2000)));
}

function loadDictationDocuments() {
  try {
    const saved = JSON.parse(localStorage.getItem(dictationDocumentStoreKey));
    const documents = Array.isArray(saved)
      ? saved
        .filter((entry) => entry && typeof entry.text === "string" && entry.text.trim())
        .map((entry) => ({
          id: entry.id || createHabitId(),
          date: entry.date || today,
          recordedAt: entry.recordedAt || new Date().toISOString(),
          source: entry.source || "dictation",
          text: entry.text.trim(),
          extraction: entry.extraction || null
        }))
        .filter((entry) => entry.date === today)
      : [];
    localStorage.setItem(dictationDocumentStoreKey, JSON.stringify(documents));
    return documents;
  } catch {
    return [];
  }
}

function saveDictationDocuments() {
  dictationDocuments = dictationDocuments
    .filter((entry) => entry && entry.text && entry.date === today)
    .sort((first, second) => String(second.recordedAt).localeCompare(String(first.recordedAt)));
  localStorage.setItem(dictationDocumentStoreKey, JSON.stringify(dictationDocuments));
}

function saveDictationDocument(text, source = "dictation", extraction = null) {
  const documentEntry = {
    id: createHabitId(),
    date: today,
    recordedAt: new Date().toISOString(),
    source,
    text: String(text || "").trim(),
    extraction: extraction || null
  };
  dictationDocuments = [documentEntry, ...dictationDocuments];
  saveDictationDocuments();
  return documentEntry;
}

function getarchiveBHistoryEntries() {
  return archiveBEntries
    .filter((entry) => entry.date >= getarchiveBHistoryCutoffKey())
    .sort((first, second) => second.date.localeCompare(first.date));
}

function getfocusStateHistoryEntries() {
  return focusStateEntries
    .filter((entry) => entry.date >= getarchiveBHistoryCutoffKey())
    .sort((first, second) => second.date.localeCompare(first.date));
}

function getarchiveBHistoryCutoffKey() {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - HISTORY_RETENTION_DAYS);
  return toDateKey(cutoff);
}

function formatarchiveBHistoryDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function loadAppSettings() {
  try {
    const savedSettings = JSON.parse(localStorage.getItem(settingsStoreKey) || "{}");
    const settings = {
      theme: "dark",
      remindersEnabled: false,
      reminderTime: "09:00",
      heightInches: 0,
      securitySalt: "",
      securityHash: "",
      guestModeEnabled: false,
      biometricEnabled: false,
      biometricCredentialId: "",
      initialDataComplete: true,
      aiExtractionEnabled: true,
      cloudAiConfirmed: true,
      aiApiKey: "",
      aiBackendUrl: DEFAULT_AI_BACKEND_URL,
      aiBackendToken: "",
      aiModel: "gpt-4o-mini",
      aiTtsModel: "gpt-4o-mini-tts",
      aiTtsVoice: "coral",
      premiumUnlocked: false,
      ...savedSettings
    };
    settings.initialDataComplete = true;
    const oldCloudConsentKey = `${"hi"}${"paa"}CloudConfirmed`;
    if (Object.prototype.hasOwnProperty.call(savedSettings, oldCloudConsentKey) && !Object.prototype.hasOwnProperty.call(savedSettings, "cloudAiConfirmed")) {
      settings.cloudAiConfirmed = Boolean(savedSettings[oldCloudConsentKey]);
    }
    delete settings[oldCloudConsentKey];
    settings.aiApiKey = "";
    settings.aiBackendUrl = normalizeAiBackendUrlInput(settings.aiBackendUrl || "", { silent: true });
    migrateAiDictationDefaults(settings);
    if (!settings.cloudAiConfirmed) settings.aiExtractionEnabled = false;
    if (!settings.aiBackendUrl) settings.aiExtractionEnabled = false;
    return settings;
  } catch {
    return {
      theme: "dark",
      remindersEnabled: false,
      reminderTime: "09:00",
      heightInches: 0,
      securitySalt: "",
      securityHash: "",
      guestModeEnabled: false,
      biometricEnabled: false,
      biometricCredentialId: "",
      initialDataComplete: true,
      aiExtractionEnabled: true,
      cloudAiConfirmed: true,
      aiApiKey: "",
      aiBackendUrl: DEFAULT_AI_BACKEND_URL,
      aiBackendToken: "",
      aiModel: "gpt-4o-mini",
      aiTtsModel: "gpt-4o-mini-tts",
      aiTtsVoice: "coral",
      premiumUnlocked: false
    };
  }
}

function migrateAiDictationDefaults(settings) {
  const migrationVersion = "ai-dictation-default-on:v2";
  if (localStorage.getItem(aiDefaultEnabledStoreKey) === migrationVersion) return;
  if (!DEFAULT_AI_BACKEND_URL) return;
  settings.aiBackendUrl = normalizeAiBackendUrlInput(settings.aiBackendUrl || DEFAULT_AI_BACKEND_URL, { silent: true });
  settings.cloudAiConfirmed = true;
  settings.aiExtractionEnabled = true;
  localStorage.setItem(aiDefaultEnabledStoreKey, migrationVersion);
  localStorage.setItem(settingsStoreKey, JSON.stringify(settings));
}

function saveAppSettings() {
  localStorage.setItem(settingsStoreKey, JSON.stringify(appSettings));
}

function markInitialDataOnboardingComplete() {
  localStorage.setItem(onboardingCompleteStoreKey, "true");
}

function applySettings() {
  document.body.dataset.theme = appSettings.theme === "light" ? "light" : "dark";
  renderSettings();
}

function renderSettings() {
  renderTaskLensAccountSettings();
  if (themeToggle) themeToggle.checked = appSettings.theme === "dark";
  if (reminderToggle) reminderToggle.checked = Boolean(appSettings.remindersEnabled);
  if (reminderTime) reminderTime.value = hasOwnSetting("reminderTime") ? appSettings.reminderTime : "";
  const totalHeight = Number(appSettings.heightInches) || 0;
  if (heightFeet) heightFeet.value = totalHeight ? String(Math.floor(totalHeight / 12)) : "";
  if (heightInches) heightInches.value = totalHeight ? String(totalHeight % 12) : "";
  if (guestModeToggle) guestModeToggle.checked = Boolean(appSettings.guestModeEnabled && !isAppLockEnabled());
  if (biometricToggle) biometricToggle.checked = Boolean(appSettings.biometricEnabled && appSettings.biometricCredentialId);
  if (cloudAiToggle) cloudAiToggle.checked = Boolean(appSettings.cloudAiConfirmed);
  if (aiExtractionToggle) aiExtractionToggle.disabled = !appSettings.cloudAiConfirmed;
  if (aiExtractionToggle) aiExtractionToggle.checked = Boolean(appSettings.aiExtractionEnabled);
  aiApiKey.value = "";
  aiApiKey.disabled = true;
  aiBackendUrl.value = hasOwnSetting("aiBackendUrl") ? appSettings.aiBackendUrl || "" : "";
  aiBackendToken.value = appSettings.aiBackendToken || "";
  aiModel.value = hasOwnSetting("aiModel") ? appSettings.aiModel || "" : "";
  if (photoAiUsageSetting) photoAiUsageSetting.textContent = getPhotoAiUsageLabel();
  if (upgradeButton) {
    upgradeButton.textContent = appSettings.premiumUnlocked ? "Premium active" : "Choose Premium";
    upgradeButton.disabled = Boolean(appSettings.premiumUnlocked);
  }
  if (aiTtsModel) aiTtsModel.value = hasOwnSetting("aiTtsModel") ? appSettings.aiTtsModel || "" : "";
  if (aiTtsVoice) aiTtsVoice.value = appSettings.aiTtsVoice || "coral";
  if (biometricToggle) biometricToggle.disabled = !isAppLockEnabled();
  if (setPasswordButton) setPasswordButton.textContent = isAppLockEnabled() ? "Change password" : "Set password";
  if (clearPasswordButton) clearPasswordButton.disabled = !isAppLockEnabled();
  if (clearPasswordButton) clearPasswordButton.textContent = appSettings.biometricCredentialId && !appSettings.securityHash ? "Clear app lock" : "Clear password";
  if (securityPasswordCurrent) securityPasswordCurrent.value = "";
  if (securityPasswordNew) securityPasswordNew.value = "";
  filterSettings();
}

function getTaskLensFirebaseConfig() {
  const config = window.TASKLENS_FIREBASE_CONFIG || {};
  return {
    apiKey: String(config.apiKey || "").trim(),
    projectId: String(config.projectId || "").trim()
  };
}

function isTaskLensFirebaseConfigured() {
  return Boolean(getTaskLensFirebaseConfig().apiKey);
}

function loadTaskLensAuthSession() {
  try {
    const session = JSON.parse(localStorage.getItem(firebaseAuthStoreKey) || "null");
    if (!session?.refreshToken || !session?.email || !session?.localId) return null;
    return session;
  } catch {
    return null;
  }
}

function saveTaskLensAuthSession(session) {
  taskLensAuthSession = session;
  if (session) localStorage.setItem(firebaseAuthStoreKey, JSON.stringify(session));
  else localStorage.removeItem(firebaseAuthStoreKey);
  renderTaskLensAccountSettings();
}

function renderTaskLensAccountSettings() {
  if (!accountStatus) return;
  const configured = isTaskLensFirebaseConfigured();
  const signedIn = Boolean(taskLensAuthSession?.refreshToken);
  if (!configured) {
    accountStatus.textContent = "Account sign-in will be available after Firebase is configured.";
  } else if (signedIn) {
    accountStatus.textContent = `Signed in as ${taskLensAuthSession.email}.`;
  } else {
    accountStatus.textContent = "Sign in to keep premium access connected to your account.";
  }
  if (accountAuthFields) accountAuthFields.hidden = signedIn;
  if (accountSignInButton) accountSignInButton.hidden = signedIn;
  if (accountCreateButton) accountCreateButton.hidden = signedIn;
  if (accountResetPasswordButton) accountResetPasswordButton.hidden = signedIn;
  if (accountSignOutButton) accountSignOutButton.hidden = !signedIn;
  [accountEmail, accountPassword, accountSignInButton, accountCreateButton, accountResetPasswordButton].forEach((element) => {
    if (element) element.disabled = !configured;
  });
}

async function createTaskLensAccount() {
  const email = String(createAccountEmail?.value || "").trim();
  const password = String(createAccountPassword?.value || "");
  const confirmPassword = String(createAccountConfirmPassword?.value || "");
  if (!email || !password || !confirmPassword) {
    if (createAccountMessage) createAccountMessage.textContent = "Enter your email and password twice.";
    showToast("Enter your email and password twice.");
    return;
  }
  if (password !== confirmPassword) {
    if (createAccountMessage) createAccountMessage.textContent = "Passwords do not match.";
    showToast("Passwords do not match.");
    return;
  }
  setTaskLensAccountBusy(true);
  try {
    await taskLensFirebaseRequest("accounts:signUp", { email, password, returnSecureToken: true });
    if (accountEmail) accountEmail.value = email;
    if (accountPassword) accountPassword.value = "";
    if (createAccountPassword) createAccountPassword.value = "";
    if (createAccountConfirmPassword) createAccountConfirmPassword.value = "";
    closeCreateAccountDialog();
    renderTaskLensAccountSettings();
    if (accountStatus) accountStatus.textContent = "Account created. Sign in to continue.";
    showToast("Account created. Sign in to continue.");
    setTimeout(() => accountPassword?.focus(), 80);
  } catch (error) {
    const message = getTaskLensAuthErrorMessage(error);
    if (createAccountMessage) createAccountMessage.textContent = message;
    showToast(message);
  } finally {
    setTaskLensAccountBusy(false);
  }
}

async function signInTaskLensAccount() {
  await runTaskLensAccountAction("accounts:signInWithPassword", "Signed in.");
}

async function runTaskLensAccountAction(action, successMessage) {
  const email = String(accountEmail?.value || "").trim();
  const password = String(accountPassword?.value || "");
  if (!email || !password) {
    showToast("Enter your email and password.");
    return;
  }
  setTaskLensAccountBusy(true);
  try {
    const response = await taskLensFirebaseRequest(action, { email, password, returnSecureToken: true });
    saveTaskLensAuthSession(normalizeTaskLensAuthSession(response));
    if (accountPassword) accountPassword.value = "";
    showToast(successMessage);
    if (pendingAccountAction) {
      accountModal.hidden = true;
      accountModal.style.display = "";
      accountModal.style.zIndex = "";
      updateDialogScrollLock();
      setTimeout(runPendingAccountAction, 80);
    }
  } catch (error) {
    showToast(getTaskLensAuthErrorMessage(error));
  } finally {
    setTaskLensAccountBusy(false);
  }
}

async function sendTaskLensPasswordReset() {
  const email = String(accountEmail?.value || "").trim();
  if (!email) {
    showToast("Enter your email first.");
    return;
  }
  setTaskLensAccountBusy(true);
  try {
    await taskLensFirebaseRequest("accounts:sendOobCode", { requestType: "PASSWORD_RESET", email });
    showToast("Password reset email sent.");
  } catch (error) {
    showToast(getTaskLensAuthErrorMessage(error));
  } finally {
    setTaskLensAccountBusy(false);
  }
}

function signOutTaskLensAccount() {
  saveTaskLensAuthSession(null);
  if (accountEmail) accountEmail.value = "";
  if (accountPassword) accountPassword.value = "";
  showToast("Signed out.");
}

function setTaskLensAccountBusy(busy) {
  [
    accountEmail,
    accountPassword,
    accountSignInButton,
    accountCreateButton,
    accountResetPasswordButton,
    accountSignOutButton,
    createAccountEmail,
    createAccountPassword,
    createAccountConfirmPassword,
    createAccountSubmitButton,
    createAccountCancel
  ].forEach((element) => {
    if (element) element.disabled = busy || (!isTaskLensFirebaseConfigured() && element !== accountSignOutButton);
  });
}

async function getTaskLensFirebaseIdToken() {
  if (!taskLensAuthSession?.refreshToken) return "";
  const expiresAt = Number(taskLensAuthSession.expiresAt || 0);
  if (taskLensAuthSession.idToken && expiresAt > Date.now() + 5 * 60 * 1000) return taskLensAuthSession.idToken;
  try {
    const refreshed = await refreshTaskLensAuthSession(taskLensAuthSession.refreshToken);
    saveTaskLensAuthSession({ ...taskLensAuthSession, ...refreshed });
    return taskLensAuthSession.idToken || "";
  } catch {
    saveTaskLensAuthSession(null);
    return "";
  }
}

async function refreshTaskLensAuthSession(refreshToken) {
  const { apiKey } = getTaskLensFirebaseConfig();
  if (!apiKey) throw new Error("FIREBASE_NOT_CONFIGURED");
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "AUTH_REFRESH_FAILED");
  return {
    idToken: data.id_token,
    refreshToken: data.refresh_token || refreshToken,
    localId: data.user_id,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000
  };
}

async function taskLensFirebaseRequest(action, body) {
  const { apiKey } = getTaskLensFirebaseConfig();
  if (!apiKey) throw new Error("FIREBASE_NOT_CONFIGURED");
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${action}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "AUTH_REQUEST_FAILED");
  return data;
}

function normalizeTaskLensAuthSession(response) {
  return {
    idToken: response.idToken,
    refreshToken: response.refreshToken,
    email: response.email,
    localId: response.localId,
    expiresAt: Date.now() + Number(response.expiresIn || 3600) * 1000
  };
}

function getTaskLensAuthErrorMessage(error) {
  const code = String(error?.message || "");
  if (/api key not valid|api_key_invalid/i.test(code)) {
    return "Firebase API key is invalid. Update the app's Firebase configuration.";
  }
  if (/operation_not_allowed/i.test(code)) {
    return "Email and password sign-in is not enabled in Firebase.";
  }
  if (/configuration_not_found/i.test(code)) {
    return "Firebase Authentication is not set up for this project.";
  }
  const messages = {
    FIREBASE_NOT_CONFIGURED: "Account sign-in is not configured yet.",
    EMAIL_EXISTS: "An account already exists for this email.",
    EMAIL_NOT_FOUND: "No account was found for this email.",
    INVALID_PASSWORD: "The password is incorrect.",
    INVALID_LOGIN_CREDENTIALS: "The email or password is incorrect.",
    WEAK_PASSWORD: "Use a password with at least 6 characters.",
    INVALID_EMAIL: "Enter a valid email address.",
    TOO_MANY_ATTEMPTS_TRY_LATER: "Too many attempts. Try again later."
  };
  return messages[code] || `Account request failed: ${code || "unknown Firebase error"}`;
}

window.TaskLensAuth = {
  getIdToken: getTaskLensFirebaseIdToken,
  getUser: () => taskLensAuthSession ? { uid: taskLensAuthSession.localId, email: taskLensAuthSession.email } : null
};

function hasOwnSetting(key) {
  try {
    const savedSettings = JSON.parse(localStorage.getItem(settingsStoreKey) || "{}");
    return Object.prototype.hasOwnProperty.call(savedSettings, key);
  } catch {
    return false;
  }
}

function filterSettings() {
  const query = (settingsSearch?.value || "").trim().toLowerCase();
  document.querySelectorAll(".settings-grid > *").forEach((item) => {
    item.hidden = Boolean(query) && !item.textContent.toLowerCase().includes(query);
  });
}

function setSettingsPasswordFieldTypes(type) {
  if (securityPasswordCurrent) securityPasswordCurrent.type = type;
  if (securityPasswordNew) securityPasswordNew.type = type;
}

function updateSetting(key, value) {
  if (key === "aiApiKey") value = "";
  if (key === "aiBackendUrl") value = normalizeAiBackendUrlInput(value);
  appSettings = { ...appSettings, [key]: value };
  if (key === "cloudAiConfirmed" && !value) {
    appSettings.aiExtractionEnabled = false;
  }
  if ((key === "aiExtractionEnabled" && value && !appSettings.cloudAiConfirmed) || (key === "aiBackendUrl" && !value)) {
    appSettings.aiExtractionEnabled = false;
  }
  appSettings.aiApiKey = "";
  saveAppSettings();
  applySettings();
  if (key === "remindersEnabled" && value) {
    requestNotificationPermission();
    checkTaskReminder();
  }
}

function updateCloudAiSharing(allowed) {
  appSettings = {
    ...appSettings,
    cloudAiConfirmed: allowed,
    aiExtractionEnabled: allowed && getConfiguredAiBackendUrl() ? appSettings.aiExtractionEnabled : false,
    aiApiKey: ""
  };
  saveAppSettings();
  applySettings();
}

function normalizeAiBackendUrlInput(value, options = {}) {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") {
      if (!options.silent) showToast("AI backend URL must start with https://");
      return "";
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    if (!options.silent) showToast("Enter a valid HTTPS AI backend URL.");
    return "";
  }
}

function getConfiguredAiBackendUrl() {
  return normalizeAiBackendUrlInput(appSettings.aiBackendUrl || "", { silent: true });
}

function updateHeightSetting() {
  const feet = Number(heightFeet?.value) || 0;
  const inches = Number(heightInches?.value) || 0;
  updateSetting("heightInches", feet * 12 + inches);
}

function isAppLockEnabled() {
  return Boolean(appSettings && (
    (appSettings.securityHash && appSettings.securitySalt)
    || appSettings.biometricCredentialId
  ));
}

function isGuestModeEnabled() {
  return Boolean(appSettings?.guestModeEnabled && !isAppLockEnabled());
}

function updateGuestModeSetting(enabled) {
  appSettings = {
    ...appSettings,
    guestModeEnabled: Boolean(enabled),
    ...(enabled ? {
      securitySalt: "",
      securityHash: "",
      biometricEnabled: false,
      biometricCredentialId: ""
    } : {})
  };
  saveAppSettings();
  renderSettings();
}

async function setAppPassword() {
  if (!securityPasswordCurrent || !securityPasswordNew) return;
  const currentPassword = securityPasswordCurrent.value;
  const newPassword = securityPasswordNew.value;
  if (newPassword.length < 4) {
    window.alert("Use at least 4 characters for the app password.");
    return;
  }
  if (isAppLockEnabled() && !(await verifyAppPassword(currentPassword))) {
    window.alert("Current password is incorrect.");
    return;
  }
  const salt = createSecurityToken(18);
  const hash = await hashSecurityPassword(newPassword, salt);
  appSettings = {
    ...appSettings,
    securitySalt: salt,
    securityHash: hash,
    guestModeEnabled: false,
    biometricEnabled: false,
    biometricCredentialId: ""
  };
  saveAppSettings();
  appUnlocked = true;
  lockModal.hidden = true;
  renderSettings();
  window.alert("App password is set. Turn on biometric unlock if you want to use the phone's face or fingerprint unlock.");
}

async function clearAppPassword() {
  if (!securityPasswordCurrent) return;
  if (!isAppLockEnabled()) return;
  if (appSettings.securityHash) {
    if (!(await verifyAppPassword(securityPasswordCurrent.value))) {
      window.alert("Enter the current password to clear app security.");
      return;
    }
  } else if (appSettings.biometricCredentialId) {
    try {
      await verifyBiometricCredential();
    } catch {
      window.alert("Biometric unlock was canceled or unavailable.");
      return;
    }
  }
  appSettings = {
    ...appSettings,
    securitySalt: "",
    securityHash: "",
    guestModeEnabled: false,
    biometricEnabled: false,
    biometricCredentialId: ""
  };
  saveAppSettings();
  appUnlocked = true;
  lockModal.hidden = true;
  renderSettings();
}

async function updateBiometricSetting() {
  if (!biometricToggle?.checked) {
    appSettings = { ...appSettings, biometricEnabled: false, biometricCredentialId: "" };
    saveAppSettings();
    renderSettings();
    return;
  }
  if (!isAppLockEnabled()) {
    window.alert("Set an app password before enabling biometric unlock.");
    renderSettings();
    return;
  }
  const confirmedPassword = await promptForPasswordConfirmation("Enter your app password to enable biometric unlock.");
  if (!confirmedPassword) {
    renderSettings();
    return;
  }
  try {
    const credentialId = await registerBiometricCredential();
    appSettings = { ...appSettings, biometricEnabled: true, biometricCredentialId: credentialId };
    saveAppSettings();
    renderSettings();
  } catch {
    appSettings = { ...appSettings, biometricEnabled: false, biometricCredentialId: "" };
    saveAppSettings();
    renderSettings();
    window.alert("Biometric unlock is not available on this device or was canceled.");
  }
}

async function promptForPasswordConfirmation(message) {
  confirmPasswordMessage.textContent = message;
  confirmPasswordError.textContent = "";
  confirmPasswordInput.value = "";
  confirmPasswordModal.hidden = false;
  window.setTimeout(() => confirmPasswordInput.focus(), 80);
  return new Promise((resolve) => {
    confirmPasswordResolver = resolve;
  });
}

async function submitConfirmPasswordDialog() {
  if (!confirmPasswordResolver) return;
  if (await verifyAppPassword(confirmPasswordInput.value)) {
    closeConfirmPasswordDialog(true);
    return;
  }
  confirmPasswordError.textContent = "Password is incorrect.";
  confirmPasswordInput.select();
}

function closeConfirmPasswordDialog(confirmed) {
  if (!confirmPasswordResolver) return;
  const resolve = confirmPasswordResolver;
  confirmPasswordResolver = null;
  confirmPasswordInput.value = "";
  confirmPasswordError.textContent = "";
  confirmPasswordModal.hidden = true;
  resolve(confirmed);
}

function showAppLock() {
  appUnlocked = false;
  lockError.textContent = "";
  lockPassword.value = "";
  document.querySelector("#lockTitle").textContent = "Unlock app";
  lockPasswordField.querySelector("span").textContent = "Password";
  lockPassword.autocomplete = "current-password";
  lockPassword.placeholder = "Password";
  lockPasswordField.hidden = !appSettings.securityHash;
  unlockButton.hidden = !appSettings.securityHash;
  setupPasswordButton.hidden = true;
  setupBiometricButton.hidden = true;
  guestModeButton.hidden = true;
  resetPasswordButton.hidden = false;
  biometricUnlockButton.hidden = !appSettings.biometricCredentialId;
  lockModal.hidden = false;
  if (appSettings.biometricCredentialId && !biometricPromptAttempted) {
    biometricPromptAttempted = true;
    window.setTimeout(() => unlockWithBiometric(), 120);
  } else if (appSettings.securityHash) {
    window.setTimeout(() => lockPassword.focus(), 100);
  }
}

function lockAppAfterBackground() {
  if (isGuestModeEnabled()) return;
  appUnlocked = false;
  biometricPromptAttempted = false;
  lockPassword.value = "";
  lockError.textContent = "";
  lockModal.hidden = false;
  affirmationModal.hidden = true;
}

function showSecuritySetup() {
  appUnlocked = false;
  const canUseBiometric = isNativeBiometricAvailable();
  lockError.textContent = canUseBiometric
    ? "Use your phone biometric/device unlock, or continue as guest."
    : "Create one app password, or continue as guest.";
  lockPassword.value = "";
  lockPasswordField.querySelector("span").textContent = "Create password";
  lockPassword.autocomplete = "new-password";
  lockPassword.placeholder = "4+ characters";
  lockPasswordField.hidden = canUseBiometric;
  unlockButton.hidden = true;
  biometricUnlockButton.hidden = true;
  resetPasswordButton.hidden = true;
  setupPasswordButton.hidden = canUseBiometric;
  setupBiometricButton.hidden = !canUseBiometric;
  guestModeButton.hidden = false;
  document.querySelector("#lockTitle").textContent = "Set up app security";
  lockModal.hidden = false;
  if (!canUseBiometric) window.setTimeout(() => lockPassword.focus(), 100);
}

function resetAppSecurityFromLock() {
  const firstConfirm = window.confirm("Reset app security? This will remove the local app password and biometric lock. Your logged task details stays on this device.");
  if (!firstConfirm) return;
  const secondConfirm = window.confirm("Are you sure? You will create a new app password next.");
  if (!secondConfirm) return;
  appSettings = {
    ...appSettings,
    securitySalt: "",
    securityHash: "",
    guestModeEnabled: false,
    biometricEnabled: false,
    biometricCredentialId: "",
    initialDataComplete: true
  };
  markInitialDataOnboardingComplete();
  saveAppSettings();
  showSecuritySetup();
  lockError.textContent = "Security was reset. Create a new app password.";
}

async function completeBiometricSecuritySetup() {
  try {
    const credentialId = await registerBiometricCredential();
    appSettings = {
      ...appSettings,
      securitySalt: "",
      securityHash: "",
      guestModeEnabled: false,
      biometricEnabled: true,
      biometricCredentialId: credentialId
    };
    saveAppSettings();
    finishUnlock();
  } catch {
    lockError.textContent = "Biometric unlock was canceled or unavailable.";
  }
}

async function completeSecuritySetup() {
  const password = lockPassword.value.trim();
  if (password.length < 4) {
    lockError.textContent = "Use at least 4 characters.";
    lockPassword.focus();
    return;
  }
  const salt = createSecurityToken(18);
  const hash = await hashSecurityPassword(password, salt);
  appSettings = {
    ...appSettings,
    securitySalt: salt,
    securityHash: hash,
    guestModeEnabled: false,
    biometricEnabled: false,
    biometricCredentialId: ""
  };
  saveAppSettings();
  lockPassword.value = "";
  finishUnlock();
}

async function unlockWithPassword() {
  if (await verifyAppPassword(lockPassword.value)) {
    finishUnlock();
    return;
  }
  lockError.textContent = "Incorrect password.";
  lockPassword.select();
}

async function unlockWithBiometric() {
  try {
    await verifyBiometricCredential();
    finishUnlock();
  } catch {
    lockError.textContent = "Biometric unlock was canceled or unavailable.";
  }
}

function continueAsGuest() {
  appSettings = {
    ...appSettings,
    guestModeEnabled: true,
    securitySalt: "",
    securityHash: "",
    biometricEnabled: false,
    biometricCredentialId: "",
    initialDataComplete: true
  };
  markInitialDataOnboardingComplete();
  saveAppSettings();
  finishUnlock();
}

function finishUnlock() {
  appUnlocked = true;
  biometricPromptAttempted = false;
  lockModal.hidden = true;
  lockPassword.value = "";
  scrollAppToTop();
  showDailyAffirmation();
}

function shouldShowInitialDataOnboarding() {
  return false;
}

function startInitialDataOnboarding() {
  onboardingStepIndex = 0;
  onboardingModal.hidden = false;
  renderInitialDataOnboarding();
}

function startGuidedDataEntry() {
  onboardingStepIndex = 0;
  onboardingModal.hidden = false;
  renderInitialDataOnboarding();
}

function renderInitialDataOnboarding() {
  const steps = getInitialDataSteps();
  const step = steps[onboardingStepIndex];
  onboardingModal.dataset.step = String(onboardingStepIndex + 1);
  onboardingModal.style.setProperty("--onboarding-progress", `${Math.round(((onboardingStepIndex + 1) / steps.length) * 100)}%`);
  onboardingStepLabel.textContent = `${onboardingStepIndex + 1} of ${steps.length}`;
  onboardingTitle.textContent = step.title;
  onboardingCopy.textContent = step.copy;
  onboardingForm.innerHTML = step.fields;
  onboardingActions.innerHTML = "";
  bindOnboardingFieldFocus();
  if (typeof step.afterRender === "function") step.afterRender();

  if (DICTATION_FEATURE_ENABLED && step.fields && /<(input|textarea|select)\b/i.test(step.fields) && !/type="checkbox"/i.test(step.fields)) {
    const dictateStepButton = document.createElement("button");
    dictateStepButton.className = "text-button onboarding-dictate-button";
    dictateStepButton.type = "button";
    dictateStepButton.setAttribute("aria-label", "Dictate into setup field");
    dictateStepButton.title = "Dictate";
    dictateStepButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"></path>
        <path d="M19 11a7 7 0 0 1-14 0"></path>
        <path d="M12 18v4"></path>
        <path d="M8 22h8"></path>
      </svg>
    `;
    dictateStepButton.addEventListener("click", dictateIntoOnboardingField);
    onboardingActions.appendChild(dictateStepButton);
  }

  const skipButton = document.createElement("button");
  skipButton.className = "text-button";
  skipButton.type = "button";
  skipButton.textContent = step.skipText || "Skip";
  skipButton.addEventListener("click", () => goToNextInitialDataStep());

  const nextButton = document.createElement("button");
  nextButton.className = "text-button";
  nextButton.type = "button";
  nextButton.textContent = step.primaryText || "Save and continue";
  nextButton.addEventListener("click", () => {
    if (typeof onboardingForm.requestSubmit === "function") {
      onboardingForm.requestSubmit();
    } else {
      step.save(new FormData(onboardingForm));
    }
  });

  onboardingActions.append(skipButton, nextButton);
  onboardingForm.onsubmit = (event) => {
    event.preventDefault();
    step.save(new FormData(onboardingForm));
  };
}

function dictateIntoOnboardingField(event) {
  const button = event?.currentTarget;
  if (activeOnboardingDictationButton && isNativeDictationAvailable() && typeof window.TaskLensDictation.stop === "function") {
    window.TaskLensDictation.stop();
    activeOnboardingDictationButton.classList.remove("is-listening");
    activeOnboardingDictationButton = null;
    return;
  }
  const field = getActiveOnboardingField();
  if (!field) {
    showToast("Tap a setup field first.");
    return;
  }
  if (button) button.classList.add("is-listening");
  activeOnboardingDictationButton = button || null;
  startSimpleDictation()
    .then((text) => applyDictatedTextToOnboardingField(field, text))
    .catch(() => {
      const typed = window.prompt("Dictation was unavailable. Type what to add to this field.", "");
      if (typed && typed.trim()) applyDictatedTextToOnboardingField(field, typed.trim());
    })
    .finally(() => {
      if (activeOnboardingDictationButton) activeOnboardingDictationButton.classList.remove("is-listening");
      activeOnboardingDictationButton = null;
    });
}

function bindOnboardingFieldFocus() {
  activeOnboardingFieldName = "";
  getOnboardingDictationFields().forEach((field) => {
    field.addEventListener("focus", () => {
      activeOnboardingFieldName = field.name || "";
    });
  });
}

function getActiveOnboardingField() {
  const active = document.activeElement;
  if (active && onboardingForm.contains(active) && isOnboardingDictationField(active)) return active;
  const fields = getOnboardingDictationFields();
  const remembered = fields.find((field) => field.name && field.name === activeOnboardingFieldName);
  if (remembered && !remembered.value) return remembered;
  const nextEmpty = getNextOnboardingDictationField(remembered);
  return nextEmpty || remembered || fields[0] || null;
}

function isOnboardingDictationField(field) {
  return field && ["INPUT", "TEXTAREA", "SELECT"].includes(field.tagName) && field.type !== "checkbox" && field.type !== "hidden";
}

function getOnboardingDictationFields() {
  return Array.from(onboardingForm.querySelectorAll("textarea, input:not([type='checkbox']):not([type='hidden']), select"))
    .filter(isOnboardingDictationField);
}

function getNextOnboardingDictationField(currentField) {
  const fields = getOnboardingDictationFields();
  if (!fields.length) return null;
  const startIndex = currentField ? fields.indexOf(currentField) + 1 : 0;
  const ordered = [...fields.slice(Math.max(startIndex, 0)), ...fields.slice(0, Math.max(startIndex, 0))];
  return ordered.find((field) => !String(field.value || "").trim()) || null;
}

function startSimpleDictation() {
  if (isNativeDictationAvailable()) return startNativeDictation();
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return Promise.reject(new Error("Dictation unavailable"));
  return new Promise((resolve, reject) => {
    const recognition = new SpeechRecognition();
    let transcript = "";
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      transcript = Array.from(event.results || [])
        .map((result) => result?.[0]?.transcript || "")
        .join(" ")
        .trim();
    };
    recognition.onerror = () => reject(new Error("Dictation failed"));
    recognition.onend = () => transcript ? resolve(transcript) : reject(new Error("No speech"));
    try {
      recognition.start();
    } catch (error) {
      reject(error);
    }
  });
}

function applyDictatedTextToOnboardingField(field, text) {
  const dictated = String(text || "").trim();
  if (!dictated || !field) return;
  if (applyStructuredDictationToOnboardingFields(dictated)) return;
  if ((field.type === "number" || field.inputMode === "numeric" || field.inputMode === "decimal") && field.value) {
    field = getNextOnboardingDictationField(field) || field;
  }
  if (field.tagName === "SELECT") {
    const options = Array.from(field.options).filter((item) => item.textContent.trim());
    const option = options.find((item) => item.textContent.toLowerCase() === dictated.toLowerCase())
      || options.find((item) => dictated.toLowerCase().includes(item.textContent.toLowerCase()));
    if (option) {
      field.value = option.value;
      field.dispatchEvent(new Event("change", { bubbles: true }));
      activeOnboardingFieldName = getNextOnboardingDictationField(field)?.name || field.name || "";
      return;
    }
  }
  if (field.type === "number" || field.inputMode === "numeric" || field.inputMode === "decimal") {
    const number = Number.parseFloat(replaceSpokenNumbers(dictated.toLowerCase()).match(/\d+(?:\.\d+)?/)?.[0] || "");
    if (Number.isFinite(number)) {
      field.value = String(number);
      field.dispatchEvent(new Event("input", { bubbles: true }));
      activeOnboardingFieldName = getNextOnboardingDictationField(field)?.name || field.name || "";
      return;
    }
  }
  const separator = field.value && field.tagName === "TEXTAREA" ? " " : "";
  field.value = `${field.value || ""}${separator}${dictated}`.trim();
  field.dispatchEvent(new Event("input", { bubbles: true }));
  activeOnboardingFieldName = getNextOnboardingDictationField(field)?.name || field.name || "";
}

async function processOnboardingStepDictation(text) {
  const transcript = String(text || "").trim();
  if (!transcript) return;
  showToast(isAiDictationEnabled() ? "AI is reading setup fields..." : "Reading setup fields...");
  try {
    const result = await parseTaskLensDictation(transcript);
    const filledCount = applyDictationResultToOnboardingFields(result, transcript);
    if (filledCount > 0) {
      showToast(`Filled ${filledCount} setup ${filledCount === 1 ? "field" : "fields"}.`);
      return;
    }
  } catch (error) {
    console.warn("Setup dictation analysis failed; using field fallback.", error);
  }
  const field = getActiveOnboardingField();
  applyDictatedTextToOnboardingField(field, transcript);
}

function applyDictationResultToOnboardingFields(result, transcript = "") {
  const fields = getOnboardingDictationFields();
  if (!fields.length || !result) return 0;
  const values = getOnboardingDictationValues(result, transcript, fields);
  let filledCount = 0;
  fields.forEach((field) => {
    if (String(field.value || "").trim()) return;
    const value = values[field.name];
    if (value === null || value === undefined || String(value).trim() === "") return;
    if (setOnboardingFieldFromDictationValue(field, value)) filledCount += 1;
  });
  return filledCount;
}

function getOnboardingDictationValues(result, transcript, fields) {
  const names = new Set(fields.map((field) => field.name));
  const archiveA = result.archiveA || {};
  const archiveB = result.archiveB || (Array.isArray(result.archiveB) ? result.archiveB[0] : null) || {};
  const task = result.task || (Array.isArray(result.tasks) ? result.tasks[0] : null) || {};
  const values = {
    valueA: archiveA.valueA,
    valueB: archiveA.valueB,
    valueC: archiveA.valueC,
    phasePhase: archiveA.phasePhase,
    valueD: archiveA.valueD,
    systolic: archiveA.systolic,
    diastolic: archiveA.diastolic,
    water: archiveA.water,
    archiveB: archiveB.name,
    severity: archiveB.severity,
    task: task.name,
    day: task.day,
    deadline: task.deadline
  };
  if (names.has("note")) {
    if (names.has("archiveB")) values.note = archiveB.note;
    else if (names.has("task")) values.note = task.note || transcript;
  }
  return values;
}

function setOnboardingFieldFromDictationValue(field, value) {
  const text = String(value ?? "").trim();
  if (!text) return false;
  if (field.tagName === "SELECT") {
    const options = Array.from(field.options).filter((item) => item.textContent.trim());
    const option = options.find((item) => item.value.toLowerCase() === text.toLowerCase())
      || options.find((item) => item.textContent.toLowerCase() === text.toLowerCase())
      || options.find((item) => text.toLowerCase().includes(item.textContent.toLowerCase()));
    if (!option) return false;
    field.value = option.value;
    field.dispatchEvent(new Event("change", { bubbles: true }));
    activeOnboardingFieldName = getNextOnboardingDictationField(field)?.name || field.name || "";
    return true;
  }
  if (field.type === "number" || field.inputMode === "numeric" || field.inputMode === "decimal") {
    const number = Number.parseFloat(text);
    if (!Number.isFinite(number)) return false;
    field.value = String(number);
  } else {
    field.value = text;
  }
  field.dispatchEvent(new Event("input", { bubbles: true }));
  activeOnboardingFieldName = getNextOnboardingDictationField(field)?.name || field.name || "";
  return true;
}

function applyStructuredDictationToOnboardingFields(text) {
  const fields = getOnboardingDictationFields();
  if (fields.length < 2) return false;
  const normalized = replaceSpokenNumbers(text.toLowerCase());
  let filledAny = false;
  fields.forEach((field) => {
    if (!(field.type === "number" || field.inputMode === "numeric" || field.inputMode === "decimal")) return;
    const labels = getOnboardingFieldDictationLabels(field);
    const number = getDictatedNumberNear(normalized, labels);
    if (!Number.isFinite(number)) return;
    field.value = String(number);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    activeOnboardingFieldName = getNextOnboardingDictationField(field)?.name || field.name || "";
    filledAny = true;
  });
  return filledAny;
}

function getOnboardingFieldDictationLabels(field) {
  const name = String(field?.name || "").toLowerCase();
  const label = field?.closest("label")?.querySelector("span")?.textContent || "";
  const baseLabels = [name, label.toLowerCase().replace(/\([^)]*\)/g, "").trim()].filter(Boolean);
  const aliases = {
    valueA: ["valueA", "valueA", "cals", "cal"],
    valueB: ["valueB", "valueBohydrates", "net valueB"],
    valueC: ["valueC", "pounds", "lbs"],
    valueD: ["valueD", "valueD"],
    systolic: ["systolic", "top number"],
    diastolic: ["diastolic", "bottom number"],
    water: ["water", "ounces", "oz"]
  };
  return [...new Set([...(aliases[name] || []), ...baseLabels])];
}

function getInitialDataSteps() {
  const dayOptions = ["<option value=\"\"></option>", ...weekDays.map((day) => `<option value="${day}">${day}</option>`)].join("");
  const onboardingState = getOnboardingState();
  const startingPoint = onboardingState.startingPoint;
  const startingContext = getOnboardingStartingContext(onboardingState);
  return [
    {
      title: "Start where you are",
      copy: "Take a photo or type the messy thought. TaskLens turns it into your next few moves.",
      primaryText: "Continue",
      skipText: "Skip",
      fields: `
        <div class="onboarding-start-card onboarding-wide">
          <strong>Built for visible work</strong>
          <div class="onboarding-start-grid" aria-label="Common starting points">
            ${["Rooms", "Piles", "Projects", "Errands"].map((item) => `
              <label class="onboarding-start-choice">
                <input name="startingPoint" type="radio" value="${item}" ${startingPoint === item ? "checked" : ""}>
                <i aria-hidden="true">${getOnboardingStartingIcon(item)}</i>
                <span>${item}</span>
              </label>
            `).join("")}
          </div>
        </div>
      `,
      afterRender: () => {
        onboardingForm.querySelectorAll("input[name='startingPoint']").forEach((input) => {
          input.addEventListener("change", () => {
            saveOnboardingState({ startingPoint: input.value });
          });
        });
      },
      save: (formData) => {
        saveOnboardingState({ startingPoint: formData.get("startingPoint") });
        goToNextInitialDataStep();
      }
    },
    {
      title: "What gets you stuck?",
      copy: "Pick one. You can change it later.",
      primaryText: "Continue",
      skipText: "Skip",
      fields: `
        <div class="preset-row onboarding-wide struggle-choice-row" aria-label="Common task struggles">
          <label class="preset-chip"><input name="taskStruggle" type="radio" value="Starting"> Starting</label>
          <label class="preset-chip"><input name="taskStruggle" type="radio" value="Prioritizing"> Prioritizing</label>
          <label class="preset-chip"><input name="taskStruggle" type="radio" value="Remembering"> Remembering</label>
          <label class="preset-chip"><input name="taskStruggle" type="radio" value="Finishing"> Finishing</label>
          <label class="preset-chip"><input name="taskStruggle" type="radio" value="Overwhelm"> Overwhelm</label>
        </div>
      `,
      save: (formData) => {
        const struggle = String(formData.get("taskStruggle") || "").trim();
        if (struggle) {
          saveOnboardingState({ struggle });
        }
        goToNextInitialDataStep();
      }
    },
    {
      title: "Start with one thing",
      copy: `${startingContext.copy} A photo will make the checklist more specific.`,
      primaryText: "Add task",
      skipText: "Finish setup",
      fields: `
        <div class="onboarding-choice-panel onboarding-wide">
          <button id="onboardingPhotoTaskButton" class="primary-button onboarding-photo-button photo-mark-button" type="button">
            <img src="icons/tasklens-camera-button.png?v=245" alt="" aria-hidden="true">
            <span>Start with a photo</span>
          </button>
          <button id="onboardingGalleryTaskButton" class="primary-button onboarding-photo-button photo-mark-button" type="button">
            <img src="icons/tasklens-camera-button.png?v=245" alt="" aria-hidden="true">
            <span>Choose from gallery</span>
          </button>
          <span>or enter one task</span>
        </div>
        <label class="field onboarding-wide"><span>Task</span><input name="task" type="text"></label>
        <label class="field"><span>Day</span><select name="day">${dayOptions}</select></label>
        <label class="field"><span>Deadline</span><input name="deadline" type="time"></label>
        <label class="field onboarding-wide"><span>Notes</span><textarea name="note" rows="3">${startingContext.note}</textarea></label>
      `,
      afterRender: () => {
        const taskInput = onboardingForm.querySelector("input[name='task']");
        if (taskInput) taskInput.placeholder = startingContext.placeholder;
        onboardingForm.querySelector("#onboardingPhotoTaskButton")?.addEventListener("click", startOnboardingPhotoTask);
        onboardingForm.querySelector("#onboardingGalleryTaskButton")?.addEventListener("click", startOnboardingGalleryTask);
      },
      save: (formData) => {
        const name = String(formData.get("task") || "").trim();
        if (!name) {
          finishInitialDataOnboarding();
          return;
        }
        habits = [createTaskDraft({
          name,
          day: String(formData.get("day") || weekDays[new Date().getDay()]),
          category: startingContext.category,
          deadline: normalizeTaskTime(String(formData.get("deadline") || "")),
          priority: "Now",
          size: "Tiny",
          note: String(formData.get("note") || "").trim()
        }), ...habits];
        updateCloudAiSharing(true);
        saveHabits();
        render();
        onboardingForm.reset();
        onboardingCopy.textContent = "Task added. Add another, or finish.";
      }
    }
  ];
}

function getOnboardingState() {
  const legacyStartingPoint = localStorage.getItem("tasklens-ai:onboarding-starting-point:v1");
  const legacyStruggle = localStorage.getItem("tasklens-ai:onboarding-struggle:v1");
  try {
    const saved = JSON.parse(localStorage.getItem("tasklens-ai:onboarding-state:v1") || "{}");
    return normalizeOnboardingState({
      startingPoint: saved.startingPoint || legacyStartingPoint,
      struggle: saved.struggle || legacyStruggle
    });
  } catch {
    return normalizeOnboardingState({ startingPoint: legacyStartingPoint, struggle: legacyStruggle });
  }
}

function saveOnboardingState(partial = {}) {
  const state = normalizeOnboardingState({ ...getOnboardingState(), ...partial });
  localStorage.setItem("tasklens-ai:onboarding-state:v1", JSON.stringify(state));
  localStorage.setItem("tasklens-ai:onboarding-starting-point:v1", state.startingPoint);
  if (state.struggle) localStorage.setItem("tasklens-ai:onboarding-struggle:v1", state.struggle);
  return state;
}

function normalizeOnboardingState(state = {}) {
  return {
    startingPoint: normalizeOnboardingStartingPoint(state.startingPoint) || "Rooms",
    struggle: normalizeOnboardingStruggle(state.struggle)
  };
}

function normalizeOnboardingStartingPoint(value) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  return ["Rooms", "Piles", "Projects", "Errands"].includes(normalized) ? normalized : "";
}

function normalizeOnboardingStruggle(value) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  return ["Starting", "Prioritizing", "Remembering", "Finishing", "Overwhelm"].includes(normalized) ? normalized : "";
}

function getOnboardingStartingIcon(startingPoint) {
  return {
    Rooms: "R",
    Piles: "P",
    Projects: "J",
    Errands: "E"
  }[startingPoint] || "R";
}

function getOnboardingStartingContext(state = getOnboardingState()) {
  const startingPoint = normalizeOnboardingStartingPoint(state.startingPoint) || "Rooms";
  const struggle = normalizeOnboardingStruggle(state.struggle);
  const struggleNote = struggle ? ` Main blocker: ${struggle.toLowerCase()}.` : "";
  const contexts = {
    Rooms: {
      category: "Home",
      copy: "Start with one room or area.",
      placeholder: "Reset the bedroom",
      note: `Focus on what is visible in the room and choose the smallest first cleanup step.${struggleNote}`
    },
    Piles: {
      category: "Home",
      copy: "Start with one pile, surface, or clutter spot.",
      placeholder: "Sort the mail pile",
      note: `Separate the pile into keep, trash, and next-action items.${struggleNote}`
    },
    Projects: {
      category: "Project",
      copy: "Start with one project that needs a next step.",
      placeholder: "Move the project forward",
      note: `Find the next visible action and keep the checklist concrete.${struggleNote}`
    },
    Errands: {
      category: "Errand",
      copy: "Start with one errand or outside task.",
      placeholder: "Handle the pharmacy errand",
      note: `List what needs to be gathered, where to go, and the next action.${struggleNote}`
    }
  };
  return contexts[startingPoint] || contexts.Rooms;
}

function startOnboardingPhotoTask() {
  const task = prepareOnboardingPhotoChecklistTask();
  openTaskBreakdownPrompt(task, { cancelDeletesTask: true, autoPhoto: true });
}

function startOnboardingGalleryTask() {
  const task = prepareOnboardingPhotoChecklistTask();
  openTaskBreakdownPrompt(task, { cancelDeletesTask: true, autoGallery: true });
}

function prepareOnboardingPhotoChecklistTask() {
  const onboardingState = getOnboardingState();
  const startingPoint = onboardingState.startingPoint;
  const startingContext = getOnboardingStartingContext(onboardingState);
  const task = createTaskDraft({
    name: `${startingPoint} photo checklist`,
    category: startingContext.category,
    priority: "Now",
    size: "Tiny",
    note: startingContext.note
  });
  appSettings = { ...appSettings, initialDataComplete: true };
  markInitialDataOnboardingComplete();
  saveAppSettings();
  updateCloudAiSharing(true);
  onboardingModal.hidden = true;
  updateDialogScrollLock();
  render();
  return task;
}

function parseOnboardingNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function saveInitialarchiveA(partial) {
  const hasEntryValue = Object.values(partial).some((value) => value !== null && value !== "");
  if (!hasEntryValue) return;

  const existing = archiveAEntries.find((entry) => entry.date === today) || {};
  const entry = {
    date: today,
    valueA: null,
    valueB: null,
    valueC: null,
    phasePhase: null,
    valueD: null,
    systolic: null,
    diastolic: null,
    water: null,
    ...existing,
    ...partial,
    recordedAt: new Date().toISOString()
  };
  archiveAEntries = [
    entry,
    ...archiveAEntries.filter((item) => item.date !== today)
  ].sort((first, second) => second.date.localeCompare(first.date));
  savearchiveAEntries();
  renderGraph();
  renderTodayDashboard();
  scheduleSmartCoachRender();
}

function goToNextInitialDataStep() {
  onboardingStepIndex += 1;
  if (onboardingStepIndex >= getInitialDataSteps().length) {
    finishInitialDataOnboarding();
    return;
  }
  renderInitialDataOnboarding();
}

function finishInitialDataOnboarding() {
  appSettings = { ...appSettings, initialDataComplete: true };
  markInitialDataOnboardingComplete();
  saveAppSettings();
  onboardingModal.hidden = true;
  render();
  showDailyAffirmation();
}

function closeInitialDataOnboarding() {
  const isFinalStep = onboardingStepIndex >= getInitialDataSteps().length - 1;
  if (isFinalStep && !window.confirm("Discard this setup task and leave onboarding? Choose Cancel to keep going.")) {
    return;
  }
  appSettings = { ...appSettings, initialDataComplete: true };
  markInitialDataOnboardingComplete();
  saveAppSettings();
  onboardingModal.hidden = true;
  render();
}

async function verifyAppPassword(password) {
  if (!isAppLockEnabled()) return true;
  const exactHash = await hashSecurityPassword(password, appSettings.securitySalt);
  if (exactHash === appSettings.securityHash) return true;
  const trimmed = String(password || "").trim();
  if (trimmed === password) return false;
  const trimmedHash = await hashSecurityPassword(trimmed, appSettings.securitySalt);
  return trimmedHash === appSettings.securityHash;
}

async function hashSecurityPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToBase64Url(new Uint8Array(digest));
}

async function registerBiometricCredential() {
  if (isNativeBiometricAvailable()) {
    await authenticateWithNativeBiometric();
    return "native";
  }
  if (!window.PublicKeyCredential || !navigator.credentials) throw new Error("No biometric API");
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "TaskLens AI" },
      user: { id: userId, name: "local-user", displayName: "TaskLens AI" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { userVerification: "required" },
      timeout: 60000
    }
  });
  if (!credential || !credential.rawId) throw new Error("No credential");
  return bytesToBase64Url(new Uint8Array(credential.rawId));
}

async function verifyBiometricCredential() {
  if (appSettings.biometricCredentialId === "native" && isNativeBiometricAvailable()) {
    return authenticateWithNativeBiometric();
  }
  if (!window.PublicKeyCredential || !navigator.credentials || !appSettings.biometricCredentialId) throw new Error("No biometric API");
  return navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{
        type: "public-key",
        id: base64UrlToBytes(appSettings.biometricCredentialId)
      }],
      userVerification: "required",
      timeout: 60000
    }
  });
}

function isNativeBiometricAvailable() {
  return Boolean(window.TaskLensSecurity && typeof window.TaskLensSecurity.authenticate === "function" && window.TaskLensSecurity.isAvailable());
}

function authenticateWithNativeBiometric() {
  return new Promise((resolve, reject) => {
    if (!isNativeBiometricAvailable()) {
      reject(new Error("Native biometric unavailable"));
      return;
    }
    const callbackId = createSecurityToken(12);
    window.__nativeBiometricCallbacks = window.__nativeBiometricCallbacks || {};
    window.__nativeBiometricCallbacks[callbackId] = { resolve, reject };
    window.__nativeBiometricResult = (id, success, message) => {
      const callback = window.__nativeBiometricCallbacks && window.__nativeBiometricCallbacks[id];
      if (!callback) return;
      delete window.__nativeBiometricCallbacks[id];
      if (success) {
        callback.resolve(true);
      } else {
        callback.reject(new Error(message || "Native biometric canceled"));
      }
    };
    window.TaskLensSecurity.authenticate(callbackId);
  });
}

function createSecurityToken(byteLength) {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

function bytesToBase64Url(bytes) {
  let value = "";
  bytes.forEach((byte) => {
    value += String.fromCharCode(byte);
  });
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function exportAppData() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks: habits,
    taskBreakdowns,
    archiveAEntries,
    archiveBEntries,
    dictationDocuments,
    taskDeadlineEvents,
    settings: getExportSafeSettings()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tasklens-ai-${today}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  localStorage.setItem(backupReminderStoreKey, today);
  showToast("Backup exported.");
}

function exportAiTrainingData() {
  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    app: "TaskLens AI",
    privacy: "Local export only. Raw photo data is not included.",
    examples: aiTrainingExamples
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tasklens-ai-feedback-${today}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast(aiTrainingExamples.length ? "AI feedback exported." : "No AI feedback has been saved yet.");
}

function getExportSafeSettings() {
  const {
    aiApiKey,
    aiBackendToken,
    securityHash,
    securitySalt,
    biometricCredentialId,
    ...safeSettings
  } = appSettings;
  return {
    ...safeSettings,
    aiApiKey: "",
    aiBackendToken: "",
    securityHash: "",
    securitySalt: "",
    biometricCredentialId: ""
  };
}

function importAppData(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const data = JSON.parse(String(reader.result || "{}"));
      if (!window.confirm("Import this backup and replace current app data?")) return;
      habits = Array.isArray(data.tasks) ? data.tasks : Array.isArray(data.habits) ? data.habits : habits;
      taskBreakdowns = data.taskBreakdowns && typeof data.taskBreakdowns === "object" ? data.taskBreakdowns : taskBreakdowns;
      archiveAEntries = Array.isArray(data.archiveAEntries) ? data.archiveAEntries : archiveAEntries;
      archiveBEntries = Array.isArray(data.archiveBEntries) ? data.archiveBEntries : archiveBEntries;
      dictationDocuments = Array.isArray(data.dictationDocuments) ? data.dictationDocuments : dictationDocuments;
      taskDeadlineEvents = Array.isArray(data.taskDeadlineEvents) ? data.taskDeadlineEvents : taskDeadlineEvents;
      appSettings = { ...appSettings, ...(data.settings || {}) };
      saveHabits();
      saveTaskBreakdowns();
      savearchiveAEntries();
      savearchiveBEntries();
      saveDictationDocuments();
      saveTaskDeadlineEvents();
      saveAppSettings();
      applySettings();
      render();
      settingsModal.hidden = true;
    } catch {
      window.alert("That backup file could not be imported.");
    } finally {
      importDataFile.value = "";
    }
  });
  reader.readAsText(file);
}

function masterResetAppData() {
  if (!window.confirm("Master reset will permanently clear all tasks, settings, password, and AI settings from this device. Continue?")) {
    return;
  }
  const confirmation = window.prompt("Type RESET to confirm master reset.", "");
  if (confirmation !== "RESET") {
    window.alert("Master reset canceled.");
    return;
  }
  localStorage.clear();
  window.alert("Master reset complete. The app will restart.");
  window.location.reload();
}

function requestNotificationPermission() {
  if (isNativeNotificationAvailable()) {
    window.TaskLensNotifications.requestPermission();
    return;
  }
  if (!("Notification" in window) || Notification.permission !== "default") return;
  Notification.requestPermission();
}

function isNativeNotificationAvailable() {
  return Boolean(window.TaskLensNotifications && typeof window.TaskLensNotifications.notify === "function");
}

function checkTaskReminder() {
  if (!appSettings.remindersEnabled) return;
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const reminderKey = `${today}-${appSettings.reminderTime}`;
  if (currentTime !== (appSettings.reminderTime || "09:00") || lastReminderKey === reminderKey) return;
  const remaining = habits.filter((habit) => isTaskScheduledForDate(habit, today) && !habit.completions.includes(today));
  if (!remaining.length) return;
  lastReminderKey = reminderKey;
  sendAppNotification(
    "TaskLens AI",
    `${remaining.length} task${remaining.length === 1 ? "" : "s"} left today.`,
    `daily:${reminderKey}`
  );
}

function checkTaskDeadlineReminders() {
  const now = new Date();
  const upcoming = getDeadlineOccurrences(now);
  upcoming.forEach((occurrence) => {
    const remaining = occurrence.dueAt.getTime() - now.getTime();
    if (remaining > 24 * 60 * 60 * 1000 && remaining <= 48 * 60 * 60 * 1000) {
      sendDeadlineNotification(occurrence, "48h");
    } else if (remaining > 0 && remaining <= 24 * 60 * 60 * 1000) {
      sendDeadlineNotification(occurrence, "24h");
    } else if (remaining <= 0) {
      sendDeadlineNotification(occurrence, "overdue");
      recordDeadlineMiss(occurrence);
    }
  });
}

function getDeadlineOccurrences(now) {
  const occurrences = [];
  for (let offset = 0; offset <= 2; offset += 1) {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    const dateKey = toDateKey(date);
    habits
      .filter((habit) => isTaskScheduledForDate(habit, dateKey) && normalizeTaskTime(habit.deadline) && !habit.completions.includes(dateKey))
      .forEach((habit) => {
        occurrences.push({
          habit,
          dateKey,
          dueAt: getTaskDeadlineDate(dateKey, habit.deadline)
        });
      });
  }
  return occurrences.filter((occurrence) => occurrence.dueAt);
}

function getCurrentOverdueTasks(now) {
  return getDeadlineOccurrences(now).filter((occurrence) => occurrence.dueAt <= now);
}

function getUpcomingDeadlineTasks(now) {
  return getDeadlineOccurrences(now)
    .filter((occurrence) => occurrence.dueAt > now && occurrence.dueAt.getTime() - now.getTime() <= 48 * 60 * 60 * 1000)
    .sort((first, second) => first.dueAt - second.dueAt);
}

function getTaskDeadlineDate(dateKey, deadline) {
  const time = normalizeTaskTime(deadline);
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  const date = parseDateKey(dateKey);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function sendDeadlineNotification(occurrence, type) {
  const key = `${occurrence.dateKey}:${occurrence.habit.id}:${type}`;
  if (deadlineAlertKeys.has(key)) return;
  deadlineAlertKeys.add(key);
  saveDeadlineAlertKeys();
  const titleByType = {
    "48h": "Task deadline in 48 hours",
    "24h": "Task deadline in 24 hours",
    overdue: "Task deadline passed"
  };
  const body = type === "overdue"
    ? `${occurrence.habit.name} is still open after its ${formatTaskTime(occurrence.habit.deadline)} deadline.`
    : `${occurrence.habit.name} is due ${formatTaskTime(occurrence.habit.deadline)} on ${formatarchiveBHistoryDate(occurrence.dateKey)}.`;
  sendAppNotification(titleByType[type], body, key);
}

function checkUpcomingTaskReminders() {
  if (!appSettings.remindersEnabled) return;
  const next = getUpcomingTaskReminderCandidates(new Date(), 5)[0];
  if (!next) return;
  const key = `${next.dateKey}:${next.habit.id}:soon`;
  if (deadlineAlertKeys.has(key)) return;
  deadlineAlertKeys.add(key);
  saveDeadlineAlertKeys();
  const when = next.offset === 1 ? "tomorrow" : `${next.dayName} (${formatarchiveBHistoryDate(next.dateKey)})`;
  sendAppNotification(
    next.missedBefore ? "Remember this task" : "Upcoming task",
    next.missedBefore
      ? `${next.habit.name} is coming up ${when}. You missed it before, so set it up early.`
      : `${next.habit.name} is coming up ${when}.`,
    key
  );
}

function recordDeadlineMiss(occurrence) {
  const exists = taskDeadlineEvents.some((event) => event.taskId === occurrence.habit.id && event.date === occurrence.dateKey);
  if (exists) return;
  taskDeadlineEvents = [{
    taskId: occurrence.habit.id,
    taskName: occurrence.habit.name,
    date: occurrence.dateKey,
    deadline: normalizeTaskTime(occurrence.habit.deadline),
    recordedAt: new Date().toISOString()
  }, ...taskDeadlineEvents];
  saveTaskDeadlineEvents();
}

function getfocusAreaTrendAlertKeys() {
  try {
    const saved = JSON.parse(localStorage.getItem(focusAreaTrendAlertStoreKey) || "[]");
    return new Set(Array.isArray(saved) ? saved.filter((key) => typeof key === "string") : []);
  } catch {
    return new Set();
  }
}

function savefocusAreaTrendAlertKeys(keys) {
  localStorage.setItem(focusAreaTrendAlertStoreKey, JSON.stringify([...keys].slice(-80)));
}

function getfocusAreaTrendNotificationInsight(source = "focusArea") {
  const insightCandidates = [
    getarchiveBTrendInsight(),
    getWholeAppTrendInsight()
  ].filter(Boolean);

  return insightCandidates.find((insight) =>
    insight.tone === "care" ||
    /archiveB|stress|declining|increasing|pattern/i.test(`${insight.title} ${insight.body} ${source}`)
  ) || null;
}

function getfocusAreaTrendNotificationBody(insight) {
  const text = `${insight.title} ${insight.body}`;
  if (/\b(urgent-risk|urgent-risk|urgent-risk|urgent|urgent situation|support|get help|get help)\b/i.test(text)) {
    return "AI Coach noticed a serious safety warning. If you might feel unsafe or are in danger, get help now, get help if available, call or text support for task support support, or call a trusted friend.";
  }
  return `${insight.title}. Is there anything that can be done to help right now? Open AI Coach for the next step.`;
}

function maybeSendfocusAreaTrendNotification(source = "focusArea") {
  const insight = getfocusAreaTrendNotificationInsight(source);
  if (!insight) return;
  const key = `${today}:${source}:${insight.title}`;
  const isurgentInsight = /\b(urgent-risk|urgent-risk|urgent-risk|urgent|urgent situation|get help|get help)\b/i.test(`${insight.title} ${insight.body}`);
  const sent = getfocusAreaTrendAlertKeys();
  if (sent.has(key) && !isurgentInsight) return;
  sent.add(key);
  savefocusAreaTrendAlertKeys(sent);
  requestNotificationPermission();
  sendAppNotification("AI Coach check-in", getfocusAreaTrendNotificationBody(insight), `focusArea:${key}`);
}

function sendAppNotification(title, body, tag = "") {
  if (isNativeNotificationAvailable()) {
    window.TaskLensNotifications.notify(title, body, tag || `${title}:${body}`);
    return;
  }
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  } else if (!("Notification" in window) || Notification.permission === "denied") {
    window.alert(`${title}\n${body}`);
  } else {
    requestNotificationPermission();
  }
}

function startTaskLensDictation(options = {}) {
  if (!DICTATION_FEATURE_ENABLED) return;
  if (dictationActive) {
    stopTaskLensDictation();
    return;
  }

  if (isNativeDictationAvailable()) {
    startNativeDictationFlow("Dictation was canceled or unavailable.", options);
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    startLegacyTaskLensDictation(options);
    return;
  }
  startKeyboardVoiceTextFlow(options);
}

function startKeyboardVoiceTextFlow(options = {}) {
  if (!options.appendToReview) {
    pendingDictationExtraction = null;
    pendingDictationTranscript = "";
  }
  const typed = window.prompt(options.appendToReview ? "Dictate or type more. I will add it to what is already in the review window." : "Use the keyboard microphone or type what you want to log. I will show a review before saving it.", "");
  if (typed && typed.trim()) handleDictationTranscript(typed.trim(), options);
}

function startLegacyTaskLensDictation(options = {}) {
  if (isNativeDictationAvailable()) {
    startNativeDictationFlow("Dictation was canceled or unavailable.", options);
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    const typed = window.prompt("Live dictation is not available on this device. Type or paste the transcript document instead.", "");
    if (typed && typed.trim()) handleDictationTranscript(typed.trim(), options);
    return;
  }
  const recognition = new SpeechRecognition();
  activeWebRecognition = recognition;
  webDictationBuffer = "";
  webDictationPartial = "";
  clearWebDictationCommitTimer();
  webDictationStopping = false;
  dictationActive = true;
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  dictateButton.classList.add("is-listening");
  setDictateButtonLabel("Stop dictation");
  webDictationCommitTimer = window.setInterval(commitWebDictationPartial, 8000);
  recognition.onresult = (event) => {
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index]?.[0]?.transcript || "";
      if (event.results[index].isFinal && transcript.trim()) {
        webDictationBuffer = `${webDictationBuffer} ${transcript.trim()}`.trim();
        webDictationPartial = "";
      } else if (transcript.trim()) {
        webDictationPartial = transcript.trim();
      }
    }
  };
  recognition.onerror = () => {
    if (!webDictationStopping && dictationActive) {
      restartWebDictation();
    }
  };
  recognition.onend = () => {
    if (!webDictationStopping && dictationActive) {
      restartWebDictation();
      return;
    }
    dictationActive = false;
    activeWebRecognition = null;
    dictateButton.classList.remove("is-listening");
    setDictateButtonLabel("Dictate");
    clearWebDictationCommitTimer();
    commitWebDictationPartial();
    handleDictationTranscript(`${webDictationBuffer} ${webDictationPartial}`.trim(), options);
    webDictationBuffer = "";
    webDictationPartial = "";
  };
  try {
    recognition.start();
  } catch {
    dictationActive = false;
    activeWebRecognition = null;
    dictateButton.classList.remove("is-listening");
    setDictateButtonLabel("Dictate");
    clearWebDictationCommitTimer();
    const typed = window.prompt("Dictation could not start. Type what you want to log.", "");
    if (typed && typed.trim()) handleDictationTranscript(typed.trim(), options);
  }
}

function startNativeDictationFlow(fallbackMessage, options = {}) {
  nativeDictationStopRequested = false;
  clearNativeDictationStopTimer();
  dictationActive = true;
  dictateButton.classList.add("is-listening");
  setDictateButtonLabel("Stop dictation");
  startNativeDictation()
    .then((transcript) => {
      if (nativeDictationStopRequested && !String(transcript || "").trim()) return;
      handleDictationTranscript(transcript, options);
    })
    .catch(() => {
      if (nativeDictationStopRequested) return;
      const typed = window.prompt(`${fallbackMessage || "Dictation was canceled or unavailable."} Type what you want to log.`, "");
      if (typed && typed.trim()) handleDictationTranscript(typed.trim(), options);
    })
    .finally(() => {
      resetNativeDictationButtonState();
    });
}

function stopTaskLensDictation() {
  if (isNativeDictationAvailable() && typeof window.TaskLensDictation.stop === "function") {
    nativeDictationStopRequested = true;
    setDictateButtonLabel("Saving dictation");
    try {
      window.TaskLensDictation.stop();
    } catch {
      // The forced reset below still clears the UI if the native bridge cannot stop.
    }
    clearNativeDictationStopTimer();
    nativeDictationStopTimer = window.setTimeout(() => {
      if (!dictationActive) return;
      resetNativeDictationButtonState();
    }, 1200);
    return;
  }

  webDictationStopping = true;
  setDictateButtonLabel("Saving dictation");
  if (activeWebRecognition) {
    activeWebRecognition.stop();
  }
}

function commitWebDictationPartial() {
  const partial = webDictationPartial.trim();
  if (!partial) return;
  if (!webDictationBuffer.endsWith(partial) && !webDictationBuffer.includes(partial)) {
    webDictationBuffer = `${webDictationBuffer} ${partial}`.trim();
  }
  webDictationPartial = "";
}

function clearWebDictationCommitTimer() {
  if (webDictationCommitTimer) {
    window.clearInterval(webDictationCommitTimer);
    webDictationCommitTimer = null;
  }
}

function resetNativeDictationButtonState() {
  dictationActive = false;
  dictateButton.classList.remove("is-listening");
  setDictateButtonLabel("Dictate");
  clearNativeDictationStopTimer();
}

function clearNativeDictationStopTimer() {
  if (nativeDictationStopTimer) {
    window.clearTimeout(nativeDictationStopTimer);
    nativeDictationStopTimer = null;
  }
}

function setDictateButtonLabel(label) {
  if (!dictateButton) return;
  dictateButton.setAttribute("aria-label", label);
  dictateButton.title = label;
  if (dictationStatus) {
    const visible = !/^Dictate$/i.test(label);
    dictationStatus.hidden = !visible;
    dictationStatus.textContent = label;
  }
}

function getDataQualityScore() {
  const recentDates = new Set(getRecentDateKeys(7, 0));
  const signals = [
    habits.some((habit) => (habit.completions || []).some((dateKey) => recentDates.has(dateKey))),
    archiveAEntries.some((entry) => recentDates.has(entry.date) && hasarchiveCData(entry)),
    archiveAEntries.some((entry) => recentDates.has(entry.date) && Number.isFinite(entry.water) && entry.water > 0),
    focusStateEntries.some((entry) => recentDates.has(entry.date)),
    archiveBEntries.some((entry) => recentDates.has(entry.date)),
    focusLogEntries.some((entry) => recentDates.has(entry.date)),
    Number(appSettings.heightInches) > 0
  ];
  return Math.round((signals.filter(Boolean).length / signals.length) * 100);
}

function maybePromptBackupReminder() {
  if (!habits.length && !archiveAEntries.length && !focusLogEntries.length && !focusStateEntries.length && !archiveBEntries.length) return;
  const lastPrompt = localStorage.getItem(backupReminderStoreKey);
  if (!lastPrompt) {
    localStorage.setItem(backupReminderStoreKey, today);
    return;
  }
  if (daysBetween(lastPrompt, today) < 7) return;
  localStorage.setItem(backupReminderStoreKey, today);
  window.setTimeout(() => {
    if (window.confirm("Export a backup of your TaskLens AI data?")) {
      exportAppData();
    }
  }, 800);
}

function restartWebDictation() {
  if (!activeWebRecognition || !dictationActive) return;
  window.setTimeout(() => {
    if (!activeWebRecognition || !dictationActive || webDictationStopping) return;
    try {
      activeWebRecognition.start();
    } catch {
      webDictationStopping = true;
      activeWebRecognition.stop();
    }
  }, 350);
}

function isNativeDictationAvailable() {
  return Boolean(window.TaskLensDictation && typeof window.TaskLensDictation.start === "function");
}

function handleDictationTranscript(transcript, options = {}) {
  const text = String(transcript || "").trim();
  if (!text) return;
  if (!options.appendToReview && onboardingModal && !onboardingModal.hidden) {
    processOnboardingStepDictation(text);
    return;
  }
  if (options.appendToReview) {
    appendDictationToReview(text);
    return;
  }
  processReviewedTaskLensDictation(text);
}

function appendDictationToReview(text) {
  const existing = dictationReviewText.value.trim();
  const addition = String(text || "").trim();
  if (!addition) return;
  const combined = existing ? `${existing} ${addition}` : addition;
  pendingDictationExtraction = null;
  pendingDictationTranscript = combined;
  pendingParsedDictationResult = null;
  pendingParsedDictationDocument = null;
  dictationReviewStepIndex = 0;
  dictationReviewField.hidden = false;
  dictationFieldReview.hidden = true;
  dictationFieldReview.replaceChildren();
  dictationReviewManual.hidden = false;
  dictationReviewChange.hidden = true;
  dictationReviewSave.textContent = "Confirm & Save";
  dictationReviewSave.disabled = false;
  dictationReviewText.value = combined;
  dictationReviewMessage.textContent = "Added to the transcript. Review it, then Confirm & Save.";
  dictationReviewModal.hidden = false;
  focusDictationReviewText();
}

function startNativeDictation() {
  return new Promise((resolve, reject) => {
    const callbackId = createSecurityToken(12);
    const timeoutId = window.setTimeout(() => {
      const callback = window.__nativeDictationCallbacks?.[callbackId];
      if (!callback) return;
      delete window.__nativeDictationCallbacks[callbackId];
      try {
        window.TaskLensDictation.stop();
      } catch {
        // Ignore native cleanup errors after a timeout.
      }
      callback.reject(new Error("Dictation timed out."));
    }, 1800000);
    window.__nativeDictationCallbacks = window.__nativeDictationCallbacks || {};
    window.__nativeDictationCallbacks[callbackId] = { resolve, reject, timeoutId };
    window.__nativeDictationResult = (id, success, transcript, message) => {
      const callback = window.__nativeDictationCallbacks?.[id];
      if (!callback) return;
      delete window.__nativeDictationCallbacks[id];
      window.clearTimeout(callback.timeoutId);
      if (success) callback.resolve(transcript || "");
      else callback.reject(new Error(message || "Dictation failed."));
    };
    window.TaskLensDictation.start(callbackId);
  });
}

function processReviewedTaskLensDictation(transcript) {
  const heard = String(transcript || "").trim();
  if (!heard) {
    handleEmptyDictation();
    return;
  }

  processTaskLensDictation(heard);
}

function showDictationReview(text, message, extraction = null) {
  const title = document.querySelector("#dictationReviewTitle");
  if (title) title.textContent = "Review what I heard";
  pendingDictationExtraction = extraction;
  pendingDictationTranscript = String(text || "").trim();
  pendingParsedDictationResult = null;
  pendingParsedDictationDocument = null;
  dictationReviewField.hidden = false;
  dictationFieldReview.hidden = true;
  dictationFieldReview.replaceChildren();
  dictationReviewManual.hidden = false;
  dictationReviewChange.hidden = true;
  dictationReviewChange.textContent = "Change";
  dictationReviewSave.textContent = "Confirm & Save";
  dictationReviewSave.disabled = false;
  dictationReviewText.value = text || "";
  dictationReviewMessage.textContent = message || "";
  dictationReviewModal.hidden = false;
  focusDictationReviewText();
  window.setTimeout(() => {
    focusDictationReviewText();
  }, 50);
}

function focusDictationReviewText() {
  if (dictationReviewField.hidden) return;
  dictationReviewText.focus({ preventScroll: false });
  dictationReviewText.setSelectionRange(dictationReviewText.value.length, dictationReviewText.value.length);
  if (window.TaskLensKeyboard && typeof window.TaskLensKeyboard.show === "function") {
    window.TaskLensKeyboard.show();
  }
}

function closeDictationReview() {
  const title = document.querySelector("#dictationReviewTitle");
  if (title) title.textContent = "Review what I heard";
  dictationReviewModal.hidden = true;
  dictationReviewMessage.textContent = "";
  dictationReviewText.value = "";
  pendingDictationExtraction = null;
  pendingDictationTranscript = "";
  pendingParsedDictationResult = null;
  pendingParsedDictationDocument = null;
  dictationReviewStepIndex = 0;
  dictationReviewSave.disabled = false;
  dictationReviewField.hidden = false;
  dictationFieldReview.hidden = true;
  dictationFieldReview.replaceChildren();
  dictationReviewManual.hidden = false;
  dictationReviewChange.hidden = true;
  dictationReviewChange.textContent = "Change";
  dictationReviewSave.textContent = "Confirm & Save";
}

async function saveReviewedDictation() {
  if (pendingParsedDictationResult) {
    applyDictationFullReview();
    commitParsedTaskLensDictation();
    return;
  }
  const reviewed = dictationReviewText.value.trim();
  if (!reviewed) {
    dictationReviewMessage.textContent = "Type or dictate something before saving.";
    dictationReviewText.focus();
    return;
  }
  dictationReviewMessage.textContent = isAiDictationEnabled() ? "AI is reading the dictation..." : "Reading the dictation...";
  dictationReviewSave.disabled = true;
  const savedExtraction = pendingDictationExtraction;
  const savedTranscript = pendingDictationTranscript;
  try {
    await processTaskLensDictation(reviewed, savedExtraction && reviewed === savedTranscript ? savedExtraction : null);
  } finally {
    dictationReviewSave.disabled = false;
  }
}

function changeReviewedDictation() {
  if (pendingParsedDictationResult && dictationReviewStepIndex > 0) {
    dictationReviewStepIndex -= 1;
    renderDictationReviewStep();
    return;
  }
  const text = pendingParsedDictationDocument?.text || dictationReviewText.value || pendingDictationTranscript;
  showDictationReview(text, "Change the transcript, then Save to analyze it again.");
}

function handleEmptyDictation() {
  showToast("I did not catch any words. Try Dictate again.");
}

function handleCanceledDictationReview() {
  showToast("Dictation was not saved.");
}

async function processTaskLensDictation(text, extraction = null) {
  const documentEntry = saveDictationDocument(text, "speaker", extraction);
  await processDictationDocument(documentEntry);
}

async function processDictationDocument(documentEntry) {
  const result = await parseTaskLensDictationDocument(documentEntry);
  await processParsedTaskLensDictation(result, documentEntry);
}

async function parseTaskLensDictationDocument(documentEntry) {
  const documentText = getDictationDocumentSearchText(documentEntry);
  if (documentEntry.extraction) {
    return normalizeAiDictationResult(documentEntry.extraction, documentText);
  }
  return parseTaskLensDictation(documentText);
}

function getDictationDocumentSearchText(documentEntry) {
  return String(documentEntry.text || "").trim();
}

async function processParsedTaskLensDictation(result, documentEntry) {
  const text = typeof documentEntry === "string" ? documentEntry : documentEntry.text || "";
  result = sanitizeDictationResultForTranscript(result, text);
  if (!hasDictationResult(result)) {
    handleUnclearDictation(text);
    return;
  }
  pendingParsedDictationResult = result;
  pendingParsedDictationDocument = typeof documentEntry === "string" ? { text: documentEntry } : documentEntry;
  showParsedDictationReview(result);
}

function commitParsedTaskLensDictation(resultToCommit = pendingParsedDictationResult) {
  const transcript = pendingParsedDictationDocument?.text || "";
  const result = sanitizeDictationResultForTranscript(resultToCommit, transcript);
  if (!result || !hasDictationResult(result)) {
    dictationReviewMessage.textContent = "There is no field data ready to save. Re-dictate or change the transcript.";
    showToast("No field data found. Try dictating again.");
    return;
  }
  populateFieldsFromDictationResult(result);
  if (result.archiveA) saveDictatedarchiveA(result.archiveA);
  if (result.archiveB) saveDictatedarchiveB(result.archiveB);
  if (Array.isArray(result.archiveB)) result.archiveB.forEach(saveDictatedarchiveB);
  if (result.focusState) saveDictatedfocusState(result.focusState);
  if (result.focusLog) saveDictatedfocusLog(result.focusLog);
  if (result.task) saveDictatedTask(result.task);
  if (Array.isArray(result.tasks)) result.tasks.forEach(saveDictatedTask);
  render();
  renderGraph();
  scheduleSmartCoachRender();
  closeDictationReview();
  showDictationLastSaved();
  showToast(getDictationSummary(result));
}

function showDictationLastSaved(date = new Date()) {
  if (!dictationStatus) return;
  dictationStatus.hidden = false;
  dictationStatus.textContent = `Last saved ${formatClockTime(date)}`;
}

function showParsedDictationReview(result) {
  dictationReviewStepIndex = 0;
  dictationReviewField.hidden = true;
  dictationFieldReview.hidden = false;
  dictationReviewManual.hidden = true;
  dictationReviewChange.hidden = false;
  dictationReviewModal.hidden = false;
  renderDictationFullReview();
}

function renderDictationFullReview() {
  const title = document.querySelector("#dictationReviewTitle");
  if (title) title.textContent = "Review Dictation";
  dictationFieldReview.replaceChildren(buildDictationFullReviewForm());
  dictationReviewChange.textContent = "Change transcript";
  dictationReviewSave.textContent = "Confirm & Save";
  dictationReviewMessage.textContent = "Review the AI-filled fields, then Confirm & Save.";
  dictationReviewSave.focus({ preventScroll: false });
}

function buildDictationFullReviewForm() {
  const form = document.createElement("form");
  form.className = "dictation-step-form dictation-full-review-form";
  form.innerHTML = getDictationReviewSteps().map((step) => `
    <div class="dictation-review-section">
      <h3>${escapeHtml(step.title.replace(/^Review\s+/i, ""))}</h3>
      ${step.fields}
    </div>
  `).join("");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    applyDictationFullReview();
    commitParsedTaskLensDictation();
  });
  return form;
}

function applyDictationFullReview() {
  const form = dictationFieldReview.querySelector("form");
  if (!form) return;
  const data = new FormData(form);
  getDictationReviewSteps().forEach((step) => step.apply(data));
}

function renderDictationReviewStep() {
  const steps = getDictationReviewSteps();
  const step = steps[dictationReviewStepIndex];
  if (!step) {
    commitParsedTaskLensDictation();
    return;
  }
  const title = document.querySelector("#dictationReviewTitle");
  if (title) title.textContent = step.title;
  dictationFieldReview.replaceChildren(buildDictationReviewStepForm(step));
  dictationReviewChange.textContent = dictationReviewStepIndex > 0 ? "Back" : "Change transcript";
  dictationReviewSave.textContent = dictationReviewStepIndex >= steps.length - 1 ? "Confirm & Save" : "Next";
  dictationReviewMessage.textContent = `Review ${dictationReviewStepIndex + 1} of ${steps.length}.`;
  dictationReviewSave.focus({ preventScroll: false });
}

function advanceDictationReviewStep() {
  const steps = getDictationReviewSteps();
  const step = steps[dictationReviewStepIndex];
  if (step) step.apply(new FormData(dictationFieldReview.querySelector("form")));
  if (dictationReviewStepIndex >= steps.length - 1) {
    commitParsedTaskLensDictation();
    return;
  }
  dictationReviewStepIndex += 1;
  renderDictationReviewStep();
}

function buildDictationReviewStepForm(step) {
  const form = document.createElement("form");
  form.className = "dictation-step-form";
  form.innerHTML = step.fields;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    advanceDictationReviewStep();
  });
  return form;
}

function getDictationReviewSteps() {
  const result = pendingParsedDictationResult || {};
  const archiveA = result.archiveA || {};
  const archiveB = getDictationarchiveB(result);
  const focusState = result.focusState || {};
  const tasks = getDictationTasks(result);
  const steps = [
    {
      title: "Review Signals",
      fields: `
        ${reviewInput("valueA", "Energy", archiveA.valueA, "number")}
        ${reviewInput("valueB", "Fuel", archiveA.valueB, "number")}
        ${reviewInput("valueC", "Value", archiveA.valueC, "number")}
        ${reviewSelect("phasePhase", "Phase", archiveA.phasePhase, ["", "Entering", "Steady", "Deep focus", "Exiting"])}
        ${reviewInput("water", "Water oz", archiveA.water, "number")}
      `,
      apply: (data) => {
        result.archiveA = result.archiveA || {};
        ["valueA", "valueB", "valueC", "water"].forEach((key) => setOptionalNumber(result.archiveA, key, data.get(key)));
        result.archiveA.phasePhase = String(data.get("phasePhase") || "") || null;
        if (!Object.values(result.archiveA).some(hasDictationReviewValue)) result.archiveA = null;
      }
    },
    {
      title: "Review Readings",
      fields: `
        ${reviewInput("valueD", "Reading", archiveA.valueD, "number")}
        ${reviewInput("systolic", "Pressure A", archiveA.systolic, "number")}
        ${reviewInput("diastolic", "Pressure B", archiveA.diastolic, "number")}
      `,
      apply: (data) => {
        result.archiveA = result.archiveA || {};
        ["valueD", "systolic", "diastolic"].forEach((key) => setOptionalNumber(result.archiveA, key, data.get(key)));
        if (!Object.values(result.archiveA).some(hasDictationReviewValue)) result.archiveA = null;
      }
    },
    {
      title: "Review Issues",
      fields: buildarchiveBReviewFields(archiveB),
      apply: (data) => setDictationarchiveB(result, readarchiveBReviewFields(data, archiveB.length || 1))
    },
    {
      title: "Review Tasks",
      fields: buildTasksReviewFields(tasks),
      apply: (data) => setDictationTasks(result, readTasksReviewFields(data, tasks.length || 1))
    }
  ];
  return steps;
}

function reviewInput(name, label, value, type = "text") {
  return `<label class="field"><span>${escapeHtml(label)}</span><input name="${escapeHtml(name)}" type="${type}" value="${escapeHtml(value ?? "")}"></label>`;
}

function reviewTextarea(name, label, value, rows = 3) {
  return `<label class="field onboarding-wide"><span>${escapeHtml(label)}</span><textarea name="${escapeHtml(name)}" rows="${rows}">${escapeHtml(value ?? "")}</textarea></label>`;
}

function reviewSelect(name, label, value, options) {
  return `<label class="field"><span>${escapeHtml(label)}</span><select name="${escapeHtml(name)}">${options.map((option) => `<option value="${escapeHtml(option)}"${String(value || "") === option ? " selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></label>`;
}

function buildarchiveBReviewFields(archiveB) {
  const entries = archiveB.length ? archiveB : [{}];
  return entries.map((archiveB, index) => `
    <div class="dictation-review-section">
      <h3>Issue ${index + 1}</h3>
      ${reviewInput(`archiveBName${index}`, "Issue", archiveB.name)}
      ${reviewSelect(`archiveBeverity${index}`, "Severity", archiveB.severity, ["", "Mild", "Moderate", "Severe"])}
      ${reviewTextarea(`archiveBNote${index}`, "Notes", archiveB.note)}
    </div>
  `).join("");
}

function buildTasksReviewFields(tasks) {
  const entries = tasks.length ? tasks : [{}];
  return entries.map((task, index) => `
    <div class="dictation-review-section">
      <h3>Task ${index + 1}</h3>
      ${reviewInput(`taskName${index}`, "Task", task.name)}
      ${reviewInput(`taskDate${index}`, "Date", task.date || today, "date")}
      ${reviewInput(`taskDeadline${index}`, "Deadline", task.deadline, "time")}
      ${reviewTextarea(`taskNote${index}`, "Notes", task.note)}
    </div>
  `).join("");
}

function getDictationarchiveB(result) {
  return [result.archiveB, ...(Array.isArray(result.archiveB) ? result.archiveB : [])].filter(Boolean);
}

function setDictationarchiveB(result, archiveB) {
  result.archiveB = archiveB[0] || null;
  result.archiveB = archiveB.slice(1);
}

function readarchiveBReviewFields(data, count) {
  return Array.from({ length: count }, (_, index) => {
    const name = String(data.get(`archiveBName${index}`) || "").trim();
    return name ? {
      name,
      severity: String(data.get(`archiveBeverity${index}`) || "Mild"),
      note: String(data.get(`archiveBNote${index}`) || "").trim()
    } : null;
  }).filter(Boolean);
}

function getDictationTasks(result) {
  return [result.task, ...(Array.isArray(result.tasks) ? result.tasks : [])].filter(Boolean);
}

function setDictationTasks(result, tasks) {
  result.task = tasks[0] || null;
  result.tasks = tasks.slice(1);
}

function readTasksReviewFields(data, count) {
  return Array.from({ length: count }, (_, index) => {
    const name = String(data.get(`taskName${index}`) || "").trim();
    const date = normalizeTaskDate(data.get(`taskDate${index}`)) || today;
    return name ? {
      name,
      date,
      day: weekDays[parseDateKey(date).getDay()],
      deadline: normalizeTaskTime(String(data.get(`taskDeadline${index}`) || "")),
      note: String(data.get(`taskNote${index}`) || "").trim()
    } : null;
  }).filter(Boolean);
}

function setOptionalNumber(target, key, value) {
  const parsed = Number.parseFloat(value);
  if (Number.isFinite(parsed)) target[key] = parsed;
  else delete target[key];
}

function buildDictationFieldReview(result) {
  const review = document.createElement("div");
  review.className = "dictation-review-sections";
  review.appendChild(buildDictationReviewSection("Issues", buildarchiveBReviewRows(result)));
  review.appendChild(buildDictationReviewSection("Signals", buildarchiveAReviewRows(result)));
  review.appendChild(buildDictationReviewSection("Readings", buildarchiveCReviewRows(result)));
  review.appendChild(buildDictationReviewSection("Tasks", buildTaskReviewRows(result)));
  return review;
}

function buildarchiveAReviewRows(result) {
  const archiveA = result.archiveA || {};
  return [
    ["Energy", archiveA.valueA],
    ["Fuel", archiveA.valueB],
    ["Value", archiveA.valueC],
    ["Phase", archiveA.phasePhase],
    ["Water", Number.isFinite(archiveA.water) ? `${archiveA.water} oz` : archiveA.water]
  ];
}

function buildarchiveCReviewRows(result) {
  const archiveA = result.archiveA || {};
  return [
    ["Reading", archiveA.valueD],
    ["Pressure", Number.isFinite(archiveA.systolic) && Number.isFinite(archiveA.diastolic) ? `${archiveA.systolic}/${archiveA.diastolic}` : ""]
  ];
}

function buildarchiveBReviewRows(result) {
  const archiveB = [result.archiveB, ...(Array.isArray(result.archiveB) ? result.archiveB : [])].filter(Boolean);
  return archiveB.flatMap((archiveB, index) => [
    [`Issue ${index + 1}`, archiveB.name],
    [`Severity ${index + 1}`, archiveB.severity],
    [`Note ${index + 1}`, archiveB.note]
  ]);
}

function buildTaskReviewRows(result) {
  const tasks = [result.task, ...(Array.isArray(result.tasks) ? result.tasks : [])].filter(Boolean);
  return tasks.flatMap((task, index) => [
    [`Task ${index + 1}`, task.name],
    [`Day ${index + 1}`, task.day],
    [`Deadline ${index + 1}`, task.deadline],
    [`Note ${index + 1}`, task.note]
  ]);
}

function buildDictationReviewSection(title, rows) {
  const section = document.createElement("section");
  section.className = "dictation-review-section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  section.appendChild(heading);
  const visibleRows = rows.filter(([, value]) => hasDictationReviewValue(value));
  if (!visibleRows.length) {
    const empty = document.createElement("p");
    empty.className = "dictation-review-empty";
    empty.textContent = "Nothing detected";
    section.appendChild(empty);
    return section;
  }
  visibleRows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "dictation-review-row";
    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    const valueEl = document.createElement("strong");
    valueEl.textContent = formatDictationReviewValue(value);
    row.append(labelEl, valueEl);
    section.appendChild(row);
  });
  return section;
}

function hasDictationReviewValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function formatDictationReviewValue(value) {
  return hasDictationReviewValue(value) ? String(value).trim() : "--";
}

function populateFieldsFromDictationResult(result) {
  if (result.archiveA) {
    archiveADate.value = today;
    if (Number.isFinite(result.archiveA.valueA)) valueA.value = String(result.archiveA.valueA);
    if (Number.isFinite(result.archiveA.valueB)) valueB.value = String(result.archiveA.valueB);
    if (Number.isFinite(result.archiveA.valueC)) valueC.value = String(result.archiveA.valueC);
    if (result.archiveA.phasePhase) phasePhase.value = result.archiveA.phasePhase;
    if (Number.isFinite(result.archiveA.valueD)) valueD.value = String(result.archiveA.valueD);
    if (Number.isFinite(result.archiveA.systolic)) systolic.value = String(result.archiveA.systolic);
    if (Number.isFinite(result.archiveA.diastolic)) diastolic.value = String(result.archiveA.diastolic);
    if (Number.isFinite(result.archiveA.water)) water.value = String(result.archiveA.water);
  }

  const archiveB = result.archiveB || (Array.isArray(result.archiveB) ? result.archiveB[0] : null);
  if (archiveB) {
    archiveBDate.value = today;
    archiveBName.value = archiveB.name || "";
    archiveBeverity.value = archiveB.severity || "Mild";
    archiveBNote.value = archiveB.note || "";
  }

  if (result.focusState && focusStateDate && focusStateName && focusStateIntensity && focusStateNote) {
    focusStateDate.value = today;
    focusStateName.value = result.focusState.name || "Okay";
    focusStateIntensity.value = result.focusState.intensity || "Moderate";
    focusStateNote.value = result.focusState.note || "";
  }

  if (result.focusLog && focusLogDate && focusLogEntry) {
    focusLogDate.value = today;
    focusLogEntry.value = result.focusLog.text || "";
    updatefocusLogEntryState();
  }

  const task = result.task || (Array.isArray(result.tasks) ? result.tasks[0] : null);
  if (task) {
    habitName.value = task.name || "";
    if (taskDate) taskDate.value = normalizeTaskDate(task.date) || today;
    habitDeadline.value = normalizeTaskTime(task.deadline);
    habitNote.value = task.note || "";
  }
}

function hasDictationResult(result) {
  return Boolean(
    result.archiveA ||
    result.archiveB ||
    result.focusState ||
    result.focusLog ||
    result.task ||
    (Array.isArray(result.archiveB) && result.archiveB.length) ||
    (Array.isArray(result.tasks) && result.tasks.length)
  );
}

function handleUnclearDictation(text = "") {
  showToast("I saved the transcript, but could not identify app fields.");
}

function promptForDictationSpecifics(result, text) {
  (result.missingDetails || []).forEach((detail) => {
    const answer = window.prompt(detail.question, "");
    if (!answer || !answer.trim()) return;
    applyDictationMissingDetail(result, detail, answer.trim(), text);
  });
}

async function parseTaskLensDictation(text) {
  const localResult = extractStructuredDictationData(text);
  if (isAiDictationEnabled()) {
    try {
      const aiResult = await extractAiDictationData(text);
      return mergeDictationResults(localResult, aiResult, text);
    } catch (error) {
      console.warn("AI dictation was too slow or unavailable; using local parser.", error);
    }
  }
  if (hasDictationResult(localResult)) {
    localResult.missingDetails = buildDictationMissingDetails(localResult, normalizeDictationText(text));
  }
  return localResult;
}

function mergeDictationResults(localResult, aiResult, text) {
  const explicitfocusLog = hasExplicitfocusLogIntent(text);
  const merged = {
    archiveA: { ...(localResult.archiveA || {}), ...(aiResult.archiveA || {}) },
    archiveB: aiResult.archiveB || localResult.archiveB || null,
    archiveB: [
      ...(Array.isArray(localResult.archiveB) ? localResult.archiveB : []),
      ...(Array.isArray(aiResult.archiveB) ? aiResult.archiveB : [])
    ],
    focusState: null,
    focusLog: null,
    task: aiResult.task || localResult.task || null,
    tasks: [
      ...(Array.isArray(localResult.tasks) ? localResult.tasks : []),
      ...(Array.isArray(aiResult.tasks) ? aiResult.tasks : [])
    ],
    missingDetails: aiResult.missingDetails || localResult.missingDetails || []
  };
  if (!Object.keys(merged.archiveA).length) merged.archiveA = null;
  merged.archiveB = dedupeDictationEntries(merged.archiveB, "name");
  merged.tasks = dedupeDictationEntries(merged.tasks, "name");
  merged.missingDetails = buildDictationMissingDetails(merged, normalizeDictationText(text));
  return merged;
}

function dedupeDictationEntries(entries, key) {
  const seen = new Set();
  return entries.filter((entry) => {
    const value = String(entry?.[key] || "").trim().toLowerCase();
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function isAiDictationEnabled() {
  return Boolean(canUseCloudAi());
}

function canUseCloudAi() {
  return Boolean(appSettings.cloudAiConfirmed && appSettings.aiExtractionEnabled && window.fetch && getConfiguredAiBackendUrl());
}

async function testAiTextToSpeech() {
  if (!canUseCloudAi()) {
    showToast("Enable cloud AI first.");
    return;
  }
  try {
    showToast("Generating AI voice...");
    await playAiTextToSpeech("AI voice is ready for TaskLens AI.");
    showToast("Playing AI-generated voice.");
  } catch (error) {
    showToast(error.message || "AI text-to-speech failed.");
  }
}

async function playAiTextToSpeech(text, options = {}) {
  const backendUrl = getConfiguredAiBackendUrl();
  if (!backendUrl) throw new Error("AI service is not configured.");
  const headers = { "Content-Type": "application/json" };
  if (appSettings.aiBackendToken) headers["X-App-Token"] = appSettings.aiBackendToken;
  const response = await fetchWithTimeout(`${backendUrl}/api/tts/speech`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      text: truncateForAi(text, 1800),
      model: appSettings.aiTtsModel || "gpt-4o-mini-tts",
      voice: appSettings.aiTtsVoice || "coral",
      instructions: options.instructions || "Speak in a warm, calm, supportive supportive task coach tone."
    })
  }, 12000);
  if (!response.ok) {
    throw new Error(await getFriendlyAiError(response, "AI text-to-speech"));
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  try {
    await new Audio(url).play();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}

function installPhoneTextToSpeechVoiceData() {
  if (window.TaskLensTextToSpeech && typeof window.TaskLensTextToSpeech.installVoiceData === "function") {
    window.TaskLensTextToSpeech.installVoiceData();
    return;
  }
  showToast("Phone voice install is available in the Android app build.");
}

async function extractAiDictationData(text) {
  if (!getConfiguredAiBackendUrl()) {
    throw new Error("AI service is not configured.");
  }
  return extractBackendAiDictationData(text);
}

async function extractBackendAiDictationData(text) {
  const headers = { "Content-Type": "application/json" };
  if (appSettings.aiBackendToken) headers["X-App-Token"] = appSettings.aiBackendToken;
  const backendUrl = getConfiguredAiBackendUrl();
  const response = await fetchWithTimeout(`${backendUrl}/api/dictation/extract`, {
    method: "POST",
    headers,
    body: JSON.stringify({ transcript: truncateForAi(text, 6000) })
  }, AI_DICTATION_TIMEOUT_MS);
  if (!response.ok) {
    throw new Error(await getFriendlyAiError(response, "AI backend"));
  }
  return normalizeAiDictationResult(await response.json(), text);
}

async function getFriendlyAiError(response, fallbackLabel) {
  const raw = await response.text();
  let message = raw;
  try {
    const outer = JSON.parse(raw);
    message = outer.error || outer.message || raw;
    if (typeof message === "string" && message.trim().startsWith("{")) {
      const inner = JSON.parse(message);
      message = inner.error?.message || inner.message || message;
    } else if (outer.error?.message) {
      message = outer.error.message;
    }
  } catch {
    // Keep the raw text.
  }
  if (/insufficient_quota|exceeded your current quota|billing/i.test(message)) {
    return "OpenAI quota is exhausted on the backend. Add billing or quota to the OpenAI account used by Render, then try dictation again.";
  }
  return message || `${fallbackLabel} failed with ${response.status}`;
}

function normalizeAiDictationResult(data, originalText) {
  const archiveA = normalizeAiarchiveA(data.archiveA);
  const archiveB = Array.isArray(data.archiveB) ? data.archiveB.map((entry) => ({
    name: cleanDictatedPhrase(entry?.name),
    severity: normalizeAiChoice(entry?.severity, ["Mild", "Moderate", "Severe"], "Mild"),
    note: String(entry?.note || "")
  })).filter((entry) => entry.name) : [];
  const tasks = Array.isArray(data.tasks) ? data.tasks.map((entry) => ({
    name: cleanDictatedPhrase(entry?.name),
    day: weekDays.includes(entry?.day) ? entry.day : weekDays[new Date().getDay()],
    time: normalizeTaskTime(String(entry?.time || "")),
    deadline: normalizeTaskTime(String(entry?.deadline || "")),
    note: String(entry?.note || originalText)
  })).filter((entry) => entry.name) : [];
  const focusState = data.focusState && data.focusState.name ? {
    name: normalizeAiChoice(data.focusState.name, ["Great", "Good", "Okay", "Low", "Stressed", "Anxious"], "Okay"),
    intensity: normalizeAiChoice(data.focusState.intensity, ["Mild", "Moderate", "Strong"], "Moderate"),
    note: String(data.focusState.note || "")
  } : null;
  const focusLog = hasExplicitfocusLogIntent(originalText) && data.focusLog && data.focusLog.text ? { text: String(data.focusLog.text).trim() } : null;
  return {
    archiveA,
    archiveB: archiveB[0] || null,
    archiveB: archiveB.slice(1),
    focusState,
    focusLog,
    task: tasks[0] || null,
    tasks: tasks.slice(1),
    missingDetails: Array.isArray(data.missingDetails) ? data.missingDetails.map((detail) => ({
      section: String(detail?.section || ""),
      field: String(detail?.field || ""),
      question: String(detail?.question || "")
    })).filter((detail) => detail.section && detail.question) : []
  };
}

function normalizeAiarchiveA(value) {
  if (!value || typeof value !== "object") return null;
  const archiveA = {};
  const aliases = {
    valueA: ["valueA", "valueA", "valueAIntake", "valueA_intake"],
    valueB: ["valueB", "valueBohydrates", "netvalueB", "net_valueB"],
    valueC: ["valueC", "pounds", "lbs"],
    valueD: ["valueD", "valueD", "value_d"],
    systolic: ["systolic", "systolicreading", "systolic_reading_pressure"],
    diastolic: ["diastolic", "diastolicreading", "diastolic_reading_pressure"],
    water: ["water", "waterOz", "water_oz", "ounces"]
  };
  Object.entries(aliases).forEach(([key, names]) => {
    const rawValue = names.map((name) => value[name]).find((item) => item !== null && item !== undefined && item !== "");
    const number = Number.parseFloat(rawValue);
    if (Number.isFinite(number)) archiveA[key] = number;
  });
  if (["Entering", "phase", "Deep phase", "Exiting"].includes(value.phasePhase)) archiveA.phasePhase = value.phasePhase;
  return Object.keys(archiveA).length ? archiveA : null;
}

function normalizeAiChoice(value, allowed, fallback) {
  const found = allowed.find((item) => item.toLowerCase() === String(value || "").toLowerCase());
  return found || fallback;
}

function sanitizeDictationResultForTranscript(result, transcript) {
  if (!result || typeof result !== "object") return result;
  if (!hasExplicitfocusLogIntent(transcript)) {
    return { ...result, focusLog: null };
  }
  return result;
}

function extractStructuredDictationData(text) {
  const normalized = normalizeDictationText(text);
  const archiveA = {};
  const valueAValue = getDictatedNumberNear(normalized, ["valueA", "valueA intake", "ate"]);
  const valueBValue = getDictatedNumberNear(normalized, ["valueB", "valueBohydrates", "net valueB"]);
  const valueCValue = getDictatedNumberNear(normalized, ["valueC", "weigh", "weighed", "pounds", "lbs"]);
  const valueDValue = getDictatedNumberNear(normalized, ["valueD", "valueD", "sugar"]);
  const waterValue = getDictatedWater(normalized);
  const readingPressure = getDictatedreading(normalized);
  const archiveB = parseDictatedarchiveB(text, normalized);
  const tasks = parseDictatedTasks(text, normalized);
  if (Number.isFinite(valueAValue)) archiveA.valueA = valueAValue;
  if (Number.isFinite(valueBValue)) archiveA.valueB = valueBValue;
  if (Number.isFinite(valueCValue)) archiveA.valueC = valueCValue;
  if (Number.isFinite(valueDValue)) archiveA.valueD = valueDValue;
  if (Number.isFinite(waterValue)) archiveA.water = waterValue;
  if (readingPressure) {
    archiveA.systolic = readingPressure.systolic;
    archiveA.diastolic = readingPressure.diastolic;
  }
  if (/\b(phase|keto)\b/i.test(normalized)) {
    archiveA.phasePhase = normalized.includes("deep") ? "Deep phase" : normalized.includes("enter") ? "Entering" : normalized.includes("exit") ? "Exiting" : "phase";
  }
  const structured = {
    archiveA: Object.keys(archiveA).length ? archiveA : null,
    archiveB: archiveB[0] || null,
    archiveB: archiveB.slice(1),
    focusState: null,
    focusLog: null,
    task: tasks[0] || null,
    tasks: tasks.slice(1),
    missingDetails: []
  };
  structured.missingDetails = buildDictationMissingDetails(structured, normalized);
  return structured;
}

function buildDictationMissingDetails(result, normalized) {
  const missing = [];
  if (/\b(?:pressure|bp)\b/i.test(normalized) && (!result.archiveA || !Number.isFinite(result.archiveA.systolic) || !Number.isFinite(result.archiveA.diastolic))) {
    missing.push({ section: "archiveA", field: "readingPressure", question: "What is the pressure reading? Use a format like 120/80." });
  }
  if (/\b(?:valueD|valueD)\b/i.test(normalized) && (!result.archiveA || !Number.isFinite(result.archiveA.valueD))) {
    missing.push({ section: "archiveA", field: "valueD", question: "What is the reading number?" });
  }
  if (/\b(?:water|water)\b/i.test(normalized) && (!result.archiveA || !Number.isFinite(result.archiveA.water))) {
    missing.push({ section: "archiveA", field: "water", question: "How many ounces of water?" });
  }
  if (/\b(?:archiveB|archiveB|i have|i feel|feeling|felt)\b/i.test(normalized) && !result.archiveB && !(result.archiveB || []).length) {
    missing.push({ section: "archiveB", field: "name", question: "What archiveB should I log?" });
  }
  if (/\b(?:add task|task|todo|to do|remind me to|need to|have to)\b/i.test(normalized) && !result.task && !(result.tasks || []).length) {
    missing.push({ section: "tasks", field: "name", question: "What task should I add?" });
  }
  return missing;
}

function applyDictationMissingDetail(result, detail, answer, originalText) {
  if (detail.section === "archiveA") {
    result.archiveA = result.archiveA || {};
    if (detail.field === "readingPressure") {
      const bp = getDictatedreading(answer);
      if (bp) {
        result.archiveA.systolic = bp.systolic;
        result.archiveA.diastolic = bp.diastolic;
      }
    } else {
      const value = Number.parseFloat(replaceSpokenNumbers(answer.toLowerCase()));
      if (Number.isFinite(value)) result.archiveA[detail.field] = value;
    }
  } else if (detail.section === "archiveB") {
    const name = cleanDictatedPhrase(answer);
    if (name) addDictationItem(result, "archiveB", "archiveB", { name, severity: "Mild", note: "" });
  } else if (detail.section === "tasks") {
    const task = buildDictatedTask(answer, normalizeDictationText(answer), originalText);
    if (task) addDictationItem(result, "task", "tasks", task);
  }
}

function addDictationItem(result, primaryKey, listKey, item) {
  if (!result[primaryKey]) {
    result[primaryKey] = item;
    return;
  }
  result[listKey] = Array.isArray(result[listKey]) ? result[listKey] : [];
  result[listKey].push(item);
}

function normalizeDictationText(text) {
  return applyDictationTextAliases(replaceSpokenNumbers(String(text || "").toLowerCase()))
    .toLowerCase()
    .replace(/\bb p\b/g, "bp")
    .replace(/\bpressurevalue\b/g, "pressure")
    .replace(/\bto do\b/g, "todo")
    .replace(/\s+/g, " ")
    .trim();
}

function applyDictationTextAliases(text) {
  const normalized = dictationNormalizationRules.reduce(
    (normalized, [pattern, replacement]) => normalized.replace(pattern, replacement),
    String(text || "")
  );
  return applyFuzzyTaskLensDictationAliases(normalized);
}

function applyFuzzyTaskLensDictationAliases(text) {
  const fuzzyAliases = {
    valueA: ["valueA", "valueA", "valueA", "calery", "caleries", "callories", "valories", "valeries", "kcal"],
    valueB: ["valueB", "valueBz", "valueBohydrates", "valueBohydrate", "valueBos"],
    valueD: ["valueD", "glucoze", "glukose", "glucous", "sugar"],
    valueC: ["valueC", "weigh", "weighed", "waight", "pounds"],
    water: ["water", "water", "water"],
    ounces: ["ounces", "ounce", "ounzes"],
    phase: ["phase", "ketones", "keytones"],
    systolic: ["systolic", "sistolic"],
    diastolic: ["diastolic", "diastollic"],
    headache: ["headache", "headake"],
    nausea: ["nausea", "nausia", "nauzea"],
    dizziness: ["dizziness", "dizzyness"],
    fatigue: ["fatigue", "fatige", "tired"],
    anxiety: ["anxiety", "anxious"],
    stressed: ["stressed", "stress"]
  };
  return String(text || "").replace(/\b[a-z]{4,}\b/g, (word) => {
    for (const [replacement, aliases] of Object.entries(fuzzyAliases)) {
      if (aliases.some((alias) => isCloseDictationWord(word, alias))) return replacement;
    }
    return word;
  });
}

function isCloseDictationWord(word, alias) {
  if (!word || !alias) return false;
  if (word === alias) return true;
  if (Math.abs(word.length - alias.length) > 2) return false;
  const maxDistance = Math.min(word.length, alias.length) >= 7 ? 2 : 1;
  return getLimitedEditDistance(word, alias, maxDistance) <= maxDistance;
}

function getLimitedEditDistance(first, second, limit) {
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let row = 1; row <= first.length; row += 1) {
    const current = [row];
    let rowMinimum = current[0];
    for (let column = 1; column <= second.length; column += 1) {
      const cost = first[row - 1] === second[column - 1] ? 0 : 1;
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + cost
      );
      rowMinimum = Math.min(rowMinimum, current[column]);
    }
    if (rowMinimum > limit) return limit + 1;
    previous.splice(0, previous.length, ...current);
  }
  return previous[second.length];
}

function replaceSpokenNumbers(text) {
  const numberWords = "(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)";
  return text.replace(new RegExp(`\\b${numberWords}(?:[\\s-]+${numberWords})*\\b`, "gi"), (phrase) => {
    const value = spokenNumberToValue(phrase);
    return Number.isFinite(value) ? String(value) : phrase;
  });
}

function spokenNumberToValue(phrase) {
  const values = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90
  };
  const tokens = phrase.toLowerCase().replace(/-/g, " ").split(/\s+/).filter(Boolean);
  if (!tokens.length || tokens.some((token) => token !== "hundred" && !Object.prototype.hasOwnProperty.call(values, token))) {
    return null;
  }
  if (tokens.length >= 2 && tokens.length <= 3 && values[tokens[0]] >= 1 && values[tokens[0]] <= 9 && values[tokens[1]] >= 20) {
    return (values[tokens[0]] * 100) + tokens.slice(1).reduce((sum, token) => sum + values[token], 0);
  }
  let total = 0;
  let current = 0;
  tokens.forEach((token) => {
    if (token === "hundred") {
      current = (current || 1) * 100;
    } else {
      current += values[token];
    }
  });
  total += current;
  return total;
}

function getDictatedNumber(text, pattern) {
  const match = String(text || "").match(pattern);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) ? value : null;
}

function getDictatedNumberNear(text, labels) {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const after = getDictatedNumber(text, new RegExp(`\\b${escaped}\\b\\s*(?:was|is|are|at|of|about|around|to|totaled|total|came to|were|for|equals?)?\\s*(\\d+(?:\\.\\d+)?)`, "i"));
    if (Number.isFinite(after)) return after;
    const before = getDictatedNumber(text, new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*(?:${escaped})\\b`, "i"));
    if (Number.isFinite(before)) return before;
  }
  return null;
}

function getDictatedWater(text) {
  const value = getDictatedNumberNear(text, ["water", "water", "ounces", "oz", "cups"]);
  if (!Number.isFinite(value)) return null;
  if (/\b(cup|cups)\b/i.test(text) && !/\b(ounce|ounces|oz)\b/i.test(text)) return value * 8;
  return value;
}

function getDictatedreading(text) {
  const exact = text.match(/\b(?:pressure|bp)?\s*(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})\b/i);
  if (exact && (/\b(?:pressure|bp)\b/i.test(text) || Number(exact[1]) >= 70)) {
    return { systolic: Number(exact[1]), diastolic: Number(exact[2]) };
  }
  const nearby = text.match(/\b(?:pressure|bp)\b(?:\s*(?:was|is|at|of))?\s*(\d{2,3})\s+(\d{2,3})\b/i);
  return nearby ? { systolic: Number(nearby[1]), diastolic: Number(nearby[2]) } : null;
}

function parseDictatedarchiveB(original, normalized) {
  const known = ["headache", "migraine", "fever", "chills", "cough", "congestion", "nausea", "dizzy", "dizziness", "fatigue", "tired", "pain", "sore throat", "chest pain", "shortness of breath", "vomiting", "discomfort", "stomach ache", "back pain", "anxiety", "rash", "sweating", "weakness", "cramps"];
  const found = known.filter((item) => new RegExp(`\\b${item.replace(/\s+/g, "\\s+")}\\b`, "i").test(normalized));
  const phraseMatch = normalized.match(/\b(?:archiveB|archiveB|i have|i've got|i am having|i'm having|i feel|feeling|felt)\s+(.*?)(?:\b(?:pressure|bp|reading|water|valueA|valueB|valueC|focusState|focusLog|task|todo|remind me)\b|$)/i);
  if (!found.length && phraseMatch) {
    const phrase = cleanDictatedPhrase(phraseMatch[1]).replace(/\b(and|also)\b/ig, ",");
    found.push(...phrase.split(",").map(cleanDictatedPhrase).filter(Boolean).slice(0, 3));
  }
  return [...new Set(found)]
    .map((name) => ({ name: cleanDictatedPhrase(name), severity: getDictatedSeverity(normalized), note: "" }))
    .filter((entry) => entry.name);
}

function getDictatedSeverity(normalized) {
  if (/\b(severe|bad|terrible|awful|extreme|intense)\b/i.test(normalized)) return "Severe";
  if (/\b(moderate|medium|noticeable)\b/i.test(normalized)) return "Moderate";
  return "Mild";
}

function parseDictatedfocusState(original, normalized) {
  const focusStateMap = [
    ["Great", /\b(great|excellent|amazing|happy|energized)\b/i],
    ["Good", /\b(good|fine|solid|positive|calm)\b/i],
    ["Low", /\b(low|sad|down|low|hopeless|empty)\b/i],
    ["Stressed", /\b(stressed|overwhelmed|pressure|tense)\b/i],
    ["Anxious", /\b(anxious|anxiety|worried|panic|nervous)\b/i],
    ["Okay", /\b(okay|ok|alright|neutral)\b/i]
  ];
  const match = focusStateMap.find(([, pattern]) => pattern.test(normalized));
  if (!match && !/\b(focusState|emotion|mental|feeling emotionally|felt emotionally)\b/i.test(normalized)) return null;
  const intensity = /\b(strong|intense|very|really|extremely)\b/i.test(normalized) ? "Strong" : /\b(mild|slight|little)\b/i.test(normalized) ? "Mild" : "Moderate";
  return { name: match ? match[0] : "Okay", intensity, note: "" };
}

function normalizeDictatedfocusState(value) {
  const lower = value.toLowerCase();
  if (lower.includes("great")) return "Great";
  if (lower.includes("good")) return "Good";
  if (lower.includes("low") || lower.includes("sad")) return "Low";
  if (lower.includes("stress")) return "Stressed";
  if (lower.includes("anx")) return "Anxious";
  return "Okay";
}

function parseDictatedfocusLog(original, normalized) {
  const match = original.match(/\b(?:focusLog|focusLog entry|make a focusLog entry|add a focusLog entry|new focusLog entry|note to self|write down in (?:my )?focusLog|put this in (?:my )?focusLog|remember this in (?:my )?focusLog)\s*[:,]?\s*(.*)$/i);
  if (match) {
    const text = cleanDictatedPhrase(match[1]);
    return text ? { text } : null;
  }
  return null;
}

function hasExplicitfocusLogIntent(text) {
  return /\b(?:focusLog|focusLog entry|make a focusLog entry|add a focusLog entry|new focusLog entry|note to self|write down in (?:my )?focusLog|put this in (?:my )?focusLog|remember this in (?:my )?focusLog)\b/i.test(String(text || ""));
}

function parseDictatedTask(original, normalized) {
  return parseDictatedTasks(original, normalized)[0] || null;
}

function parseDictatedTasks(original, normalized) {
  const pieces = original.split(/\b(?:also add|add another task|new task|next task|and remind me to|remind me to|add task|task is|task:|todo|to do|i need to|need to|i have to|have to)\b/i);
  const taskPhrases = pieces.length > 1 ? pieces.slice(1).map(cleanDictatedPhrase).filter(Boolean) : [];
  if (!taskPhrases.length && /\b(?:add task|task|todo|to do|remind me to|need to|i need to|i have to|have to)\b/i.test(original)) {
    const fallback = original.match(/\b(?:add task|task|todo|to do|remind me to|need to|i need to|i have to|have to)\s+(.*)$/i);
    if (fallback) taskPhrases.push(cleanDictatedPhrase(fallback[1]));
  }
  return taskPhrases.map((phrase) => buildDictatedTask(phrase, normalized, original)).filter(Boolean);
}

function buildDictatedTask(phrase, normalized, original) {
  let name = cleanDictatedPhrase(phrase)
    .replace(/\b(on )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|today|tomorrow)\b/ig, "")
    .replace(/\b(?:by|due at|deadline|at)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/ig, "")
    .replace(/\b(?:with a deadline|deadline is|due)\b.*$/ig, "")
    .trim();
  if (!name || name.length < 2) return null;
  name = name.charAt(0).toUpperCase() + name.slice(1);
  return { name, day: getDictatedTaskDay(`${normalized} ${phrase.toLowerCase()}`), deadline: getDictatedTaskTime(`${normalized} ${phrase.toLowerCase()}`), note: original };
}

function getDictatedTaskDay(normalized) {
  return weekDays.find((day) => normalized.includes(day.toLowerCase())) || weekDays[new Date().getDay()];
}

function getDictatedTaskTime(normalized) {
  const match = normalized.match(/\b(?:by|due at|deadline|at)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!match) return "";
  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const period = match[3];
  if (period === "pm" && hours < 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function cleanDictatedPhrase(value) {
  return String(value || "")
    .replace(/\b(?:is|are|at|of|today|please)\b/ig, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function saveDictatedarchiveA(partial) {
  const existing = archiveAEntries.find((entry) => entry.date === today) || {};
  archiveAEntries = [{
    date: today,
    valueA: null,
    valueB: null,
    valueC: null,
    phasePhase: null,
    valueD: null,
    systolic: null,
    diastolic: null,
    water: null,
    ...existing,
    ...partial,
    recordedAt: new Date().toISOString()
  }, ...archiveAEntries.filter((entry) => entry.date !== today)].sort((first, second) => second.date.localeCompare(first.date));
  savearchiveAEntries();
}

function saveDictatedarchiveB(archiveB) {
  archiveBEntries = [{ id: createHabitId(), date: today, recordedAt: new Date().toISOString(), ...archiveB }, ...archiveBEntries];
  savearchiveBEntries();
}

function saveDictatedfocusState(focusState) {
  focusStateEntries = [{ id: createHabitId(), date: today, recordedAt: new Date().toISOString(), ...focusState }, ...focusStateEntries];
  savefocusStateEntries();
}

function saveDictatedfocusLog(focusLog) {
  focusLogEntries = [{ id: createHabitId(), date: today, text: focusLog.text }, ...focusLogEntries];
  savefocusLogEntries();
}

function saveDictatedTask(task) {
  habits = [createTaskDraft({
    name: task.name,
    day: task.day,
    category: "General",
    deadline: normalizeTaskTime(task.deadline),
    priority: "Next",
    size: "Small",
    note: task.note
  }), ...habits];
  saveHabits();
}

function getDictationSummary(result) {
  const taskCount = (result.task ? 1 : 0) + (Array.isArray(result.tasks) ? result.tasks.length : 0);
  const archiveBCount = (result.archiveB ? 1 : 0) + (Array.isArray(result.archiveB) ? result.archiveB.length : 0);
  const parts = [
    result.archiveA ? "archiveC/archiveA" : "",
    archiveBCount ? `${archiveBCount} archiveB${archiveBCount === 1 ? "" : "s"}` : "",
    result.focusState ? "focusState" : "",
    result.focusLog ? "focusLog" : "",
    taskCount ? `${taskCount} task${taskCount === 1 ? "" : "s"}` : ""
  ].filter(Boolean);
  return parts.length ? `Dictation saved: ${parts.join(", ")}. AI Coach refreshed.` : "I heard the dictation, but could not identify task details or a task to save.";
}

function getWeeklyTotals() {
  return getWeeklyCompletionTotals();
}

async function importreadingFromWatch() {
  let value = "";
  if (navigator.clipboard && window.isSecureContext) {
    try {
      value = await navigator.clipboard.readText();
    } catch {
      value = "";
    }
  }

  if (!value) {
    value = window.prompt("Paste a reading from a watch app, wearable app, CSV rows, or another export snippet.", "") || "";
  }

  const reading = getreadingReading(value);
  if (!reading) {
    window.alert("Could not find a pressure reading. Paste a value like 120/80, labeled paired values, CSV rows, or an export snippet.");
    return;
  }

  applyreadingReading(reading);
  window.alert(`Imported reading ${reading.systolic}/${reading.diastolic}${reading.dateKey ? ` for ${reading.dateKey}` : ""}.`);
}

function applyreadingFromUrl() {
  const params = new URLSearchParams(location.search);
  const value = params.get("bp") || params.get("readingPressure");
  const systolicValue = params.get("systolic") || params.get("sys");
  const diastolicValue = params.get("diastolic") || params.get("dia");

  if (value && setreadingFromText(value)) return;
  if (systolicValue && diastolicValue) {
    setreadingFromText(`${systolicValue}/${diastolicValue}`);
  }
}

function setreadingFromText(value) {
  const reading = getreadingReading(value);
  if (!reading) return false;

  applyreadingReading(reading);
  return true;
}

function applyreadingReading(reading) {
  systolic.value = String(reading.systolic);
  diastolic.value = String(reading.diastolic);
  if (reading.dateKey) {
    archiveADate.value = reading.dateKey;
  }
}

function getreadingReading(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const readings = [
    ...parseWatchreading(text),
    ...parseDelimitedreading(text),
    ...parseLabeledreading(text),
    ...parseSlashreading(text)
  ].filter(isValidreadingReading);

  if (!readings.length) return null;

  return readings.reduce((best, current) => {
    if (!best) return current;
    if (current.timestamp && !best.timestamp) return current;
    if (current.timestamp && best.timestamp && current.timestamp > best.timestamp) return current;
    if (!current.timestamp && !best.timestamp && current.sequence > best.sequence) return current;
    return best;
  }, null);
}

function parseWatchreading(text) {
  const systolicRecords = getWatchExportRecords(text, "Systolic");
  const diastolicRecords = getWatchExportRecords(text, "Diastolic");

  return systolicRecords.flatMap((systolicRecord) => {
    const partner = diastolicRecords
      .filter((diastolicRecord) => Math.abs((diastolicRecord.timestamp || 0) - (systolicRecord.timestamp || 0)) < 5 * 60 * 1000)
      .sort((first, second) => Math.abs((first.timestamp || 0) - (systolicRecord.timestamp || 0)) - Math.abs((second.timestamp || 0) - (systolicRecord.timestamp || 0)))[0];

    return partner ? [{
      systolic: systolicRecord.value,
      diastolic: partner.value,
      dateKey: systolicRecord.dateKey || partner.dateKey,
      timestamp: systolicRecord.timestamp || partner.timestamp,
      sequence: systolicRecord.sequence
    }] : [];
  });
}

function getWatchExportRecords(text, kind) {
  const records = [];
  const pattern = new RegExp(`<Record\\b[^>]*reading${kind}[^>]*>`, "gi");
  let match;
  let sequence = 0;

  while ((match = pattern.exec(text))) {
    const record = match[0];
    const value = Number((record.match(/\bvalue="([^"]+)"/i) || [])[1]);
    const dateText = (record.match(/\b(?:startDate|creationDate)="([^"]+)"/i) || [])[1] || "";
    const date = parsereadingDate(dateText);
    records.push({
      value,
      dateKey: date.dateKey,
      timestamp: date.timestamp,
      sequence: sequence += 1
    });
  }

  return records;
}

function parseDelimitedreading(text) {
  const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const readings = [];
  let sequence = 0;

  rows.forEach((line, index) => {
    const delimiter = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
    const columns = splitDelimitedLine(line, delimiter);
    if (columns.length < 2) return;

    const header = columns.map(normalizeColumnName);
    const systolicIndex = header.findIndex((column) => column.includes("systolic") || column === "sys" || column.endsWith("sys"));
    const diastolicIndex = header.findIndex((column) => column.includes("diastolic") || column === "dia" || column.endsWith("dia"));
    if (systolicIndex === -1 || diastolicIndex === -1) return;

    rows.slice(index + 1).forEach((row) => {
      const values = splitDelimitedLine(row, delimiter);
      const systolicValue = Number(values[systolicIndex]);
      const diastolicValue = Number(values[diastolicIndex]);
      const date = parsereadingDate(row);
      readings.push({
        systolic: systolicValue,
        diastolic: diastolicValue,
        dateKey: date.dateKey,
        timestamp: date.timestamp,
        sequence: sequence += 1
      });
    });
  });

  return readings;
}

function parseLabeledreading(text) {
  let sequence = 0;
  return text.split(/\r?\n/).flatMap((line) => {
    const systolicMatch = line.match(/\b(?:sys|systolic)\b[^\d]{0,24}(\d{2,3})/i);
    const diastolicMatch = line.match(/\b(?:dia|diastolic)\b[^\d]{0,24}(\d{2,3})/i);
    if (!systolicMatch || !diastolicMatch) return [];

    const date = parsereadingDate(line);
    return [{
      systolic: Number(systolicMatch[1]),
      diastolic: Number(diastolicMatch[1]),
      dateKey: date.dateKey,
      timestamp: date.timestamp,
      sequence: sequence += 1
    }];
  });
}

function parseSlashreading(text) {
  const readings = [];
  const pattern = /(\d{2,3})\s*\/\s*(\d{2,3})/g;
  let match;
  let sequence = 0;

  while ((match = pattern.exec(text))) {
    const lineStart = text.lastIndexOf("\n", match.index) + 1;
    const lineEnd = text.indexOf("\n", match.index);
    const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
    const date = parsereadingDate(line || text);
    readings.push({
      systolic: Number(match[1]),
      diastolic: Number(match[2]),
      dateKey: date.dateKey,
      timestamp: date.timestamp,
      sequence: sequence += 1
    });
  }

  return readings;
}

function splitDelimitedLine(line, delimiter) {
  const values = [];
  let current = "";
  let quoted = false;

  for (const character of line) {
    if (character === "\"") {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values;
}

function normalizeColumnName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parsereadingDate(value) {
  const text = String(value || "");
  const isoMatch = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  const usMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})(?:[ T](\d{1,2}):(\d{2}))?/);
  const parts = isoMatch
    ? { year: isoMatch[1], month: isoMatch[2], day: isoMatch[3], hour: isoMatch[4] || "0", minute: isoMatch[5] || "0" }
    : usMatch
      ? { year: usMatch[3], month: usMatch[1], day: usMatch[2], hour: usMatch[4] || "0", minute: usMatch[5] || "0" }
      : null;

  if (!parts) return { dateKey: "", timestamp: 0 };

  const date = new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  if (Number.isNaN(date.getTime())) return { dateKey: "", timestamp: 0 };

  return {
    dateKey: toDateKey(date),
    timestamp: date.getTime()
  };
}

function isValidreadingReading(reading) {
  return reading
    && Number.isFinite(reading.systolic)
    && Number.isFinite(reading.diastolic)
    && reading.systolic >= 50
    && reading.systolic <= 260
    && reading.diastolic >= 30
    && reading.diastolic <= 180;
}

function applyTaskFromUrl() {
  const params = new URLSearchParams(location.search);
  const name = (params.get("habit") || params.get("addHabit") || params.get("task") || params.get("addTask") || "").trim();
  if (!name) return;

  const day = params.get("day");
  const newHabit = {
    id: createHabitId(),
    name: name.slice(0, 32),
    day: weekDays.includes(day) ? day : weekDays[new Date().getDay()],
    category: (params.get("category") || "status").slice(0, 24),
    time: ["Anytime", "Morning", "Afternoon", "Evening", "Night"].includes(params.get("time"))
      ? params.get("time")
      : "Anytime",
    priority: ["Normal", "High", "Low"].includes(params.get("priority"))
      ? params.get("priority")
      : "Normal",
    color: /^#[0-9a-f]{6}$/i.test(params.get("color") || "") ? params.get("color") : "#4574fa",
    note: (params.get("note") || "").slice(0, 72),
    completions: []
  };

  habits.unshift(newHabit);
  saveHabits();

  if (history.replaceState) {
    history.replaceState(null, "", `${location.pathname}${location.hash}`);
  }
}

function getphasePhaseLevel(phase) {
  const values = {
    Entering: 1,
    phase: 2,
    "Deep phase": 3,
    Exiting: 1
  };
  return values[phase] ?? null;
}

function formatphasePhase(phase) {
  return phase ? phase : "--";
}

function formatreading(systolicValue, diastolicValue, includeUnits = false) {
  if (!Number.isFinite(systolicValue) && !Number.isFinite(diastolicValue)) return "--";
  const systolicText = Number.isFinite(systolicValue) ? formatWholeNumber(systolicValue) : "--";
  const diastolicText = Number.isFinite(diastolicValue) ? formatWholeNumber(diastolicValue) : "--";
  const value = `${systolicText}/${diastolicText}`;
  return includeUnits ? `${value} mmHg` : value;
}

applyreadingFromUrl();
applyTaskFromUrl();
render();
scrollAppToTop();
finishUnlock();
