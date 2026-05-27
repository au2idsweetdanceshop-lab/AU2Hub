// ==========================================
// KONEKSI SUPABASE
// ==========================================
const SUPABASE_URL = "https://divckiqkodtqudcoxkjz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpdmNraXFrb2R0cXVkY294a2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDY0MzIsImV4cCI6MjA5MzkyMjQzMn0.z_FIS_rpDQPQ7nNWpuvabH7qDYgu7uq6TlYj9LSOcJQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// STATE & VARIABEL GLOBAL
// ==========================================
let currentUser = null;
let userProfile = null;
let isAuthLogin = true;
let tabSebelumnya = 'home';

// Variabel Chat & Grup
let activeGroupId = null;
let activeGroupRole = 'member';
let globalPersonalList = [];
let globalGroupList = [];
let messageToForward = "";
let activeChatUserId = null;
let messageSubscription = null;
let globalMessageSubscription = null;
let presenceChannel = null;
let onlineUsersMap = new Map();
let selectedMessageId = null;
let blockedUsersList = [];
let typingTimer;

// Variabel Data & UI
let dataRipperGlobal = [];
let isRipperExpanded = localStorage.getItem('statusLihatSemua') === 'true';
let viewedUserId = null;
let globalFaqData = [];
let isInfoLoaded = false;
let isRekberLoaded = false;

// Variabel Feed Video & Story
let allVideosData = [];
let newUploads = [];
let obs = null;
let activeVideoId = null;
let lastTap = 0;
let isGlobalMuted = true;
let replyingToId = null;
let replyingToName = null;
let currentVideoIndex = 0;
const BATCH_SIZE = 5;
let currentProfileVideos = [];
let profileFeedIndex = 0;
let floatObs = null;
let currentActiveStories = [];
let currentStoryTimer;
let privasiVideoAktif = 'Publik';
let isUploading = false;

// Variabel Media & Upload
let mediaPreviewFile = null;
let mediaPreviewContext = '';
let fileJualanArray = [];
let editFileArray = [];
let existingImagesEdit = [];

// Variabel Toko, Pasar & Pembayaran
let xoftwareProdukGlobal = [];
let kategoriAktif = 'Semua';
let currentProductPrice = 0;
let currentProductQty = 1;
let currentSelectedVariation = "";
let globalDataPasar = [];
let idPenjualAktif = null;
let kategoriPasarAktif = 'Semua';
let activeOrderIdToPay = null;
let activeOrderPriceToPay = 0;
let activeOrderNameToPay = "";
let activeOrderTable = 'orders';
let activeOrderSellerId = null;
let activeOrderProductId = null;

// Variabel Swipe (UI)
let storyStartY = 0;
let storyCurrentY = 0;
let lbTouchStartX = 0;
let lbTouchStartY = 0;
let chatSwipeStartX = 0;
let chatSwipeStartY = 0;
let replyingToMsgId = null;
let replyingToMsgText = "";
let replyingToMsgName = "";

