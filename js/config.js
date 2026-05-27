// ==========================================
// js/config.js - KONFIGURASI & STATE GLOBAL
// ==========================================

const SUPABASE_URL = "https://divckiqkodtqudcoxkjz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpdmNraXFrb2R0cXVkY294a2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDY0MzIsImV4cCI6MjA5MzkyMjQzMn0.z_FIS_rpDQPQ7nNWpuvabH7qDYgu7uq6TlYj9LSOcJQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State Autentikasi & Profil
let currentUser = null;
let userProfile = null;
let isAuthLogin = true;
let blockedUsersList = [];
let viewedUserId = null;

// State Navigasi
let tabSebelumnya = 'home';

// State Chat & Komunitas
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
let typingTimer;

// State Data Global
let dataRipperGlobal = [];
let isRipperExpanded = localStorage.getItem('statusLihatSemua') === 'true';
let globalFaqData = [];
let isInfoLoaded = false;
let isRekberLoaded = false;

// State Video & Feed
let allVideosData = [];
let newUploads = [];
let obs = null;
let floatObs = null;
let activeVideoId = null;
let lastTap = 0;
let isGlobalMuted = true;
let currentVideoIndex = 0;
const BATCH_SIZE = 5;
let currentProfileVideos = [];
let profileFeedIndex = 0;
let isUploading = false;
let privasiVideoAktif = 'Publik';

// State Komentar & Story
let replyingToId = null;
let replyingToName = null;
let currentActiveStories = [];
let currentStoryTimer;
let commentSubscription = null;

// State Pasar & Toko
let xoftwareProdukGlobal = [];
let globalDataPasar = [];
let kategoriAktif = 'Semua';
let kategoriPasarAktif = 'Semua';
let idPenjualAktif = null;

// State Pembayaran & Checkout
let activeOrderIdToPay = null;
let activeOrderPriceToPay = 0;
let activeOrderNameToPay = "";
let activeOrderTable = 'orders';
let activeOrderSellerId = null; 
let activeOrderProductId = null;
let currentProductPrice = 0;
let currentProductQty = 1;
let currentSelectedVariation = "";
