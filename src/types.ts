export interface User { id:string; name:string; email:string; role:'user'|'admin'|'support'|'editor'; createdAt:string; updatedAt?:string; termsAcceptedAt?:string; privacyAcceptedAt?:string; termsVersion?:string; privacyVersion?:string; currentCompanyId?:string; avatarUrl?:string; emailVerified?:boolean; }
export interface MarketingProfile { niche:string; targetAudience:string; persona:string; toneOfVoice:string; brandIdentitySummary:string; goals:string; keyDifferentials:string; forbiddenWords:string[]; preferredCtas:string[]; topKeywords:string[]; lastUpdated:string; }
export interface Company { id:string; userId:string; name:string; slug:string; logoUrl?:string; logoStoragePath?:string; description:string; businessType?:'online'|'physical'|'hybrid'; onlineChannels?:string[]; website?:string; androidApp?:string; iosApp?:string; phone?:string; whatsapp?:string; email?:string; address?:string; city?:string; state?:string; country?:string; category:string; segment?:string; products:string[]; services:string[]; targetAudience?:string; coverageRegion?:string; differentials?:string; brandTone?:string; goals?:string; competitors?:string[]; keywords:string[]; socialLinks?:{instagram?:string;facebook?:string;tiktok?:string;youtube?:string;linkedin?:string;pinterest?:string;x?:string}; isPublicInVitrine:boolean; marketingProfile?:MarketingProfile; active?:boolean; dailyMarketingEnabled?:boolean; dailyBlogEnabled?:boolean; isSeedProject?:boolean; createdAt:string; updatedAt:string; }
export interface ContentItem { id:string; userId:string; companyId:string; type:'post'|'image'|'video'|'video_script'|'article'|'cta'|'headline'|'carousel'|'email'; title:string; headline?:string; body:string; cta?:string; hashtags:string[]; keywords:string[]; visualPrompt?:string; imageUrl?:string; videoUrl?:string; videoScript?:string; carouselSlides?:{title:string;text:string;visualDesc?:string}[]; targetPlatform?:string; tone?:string; status:'draft'|'saved'|'scheduled'|'published'; createdAt:string; updatedAt:string; metadata?:Record<string,any>; }
export interface Campaign { id:string; userId:string; companyId:string; name:string; objective:string; targetPlatforms:string[]; targetAudience?:string; startDate:string; endDate?:string; status:'draft'|'pending'|'scheduled'|'active'|'paused'|'completed'|'failed'; contentItemIds:string[]; metrics:{reach:number;clicks:number;leads:number;conversions:number;shares:number;comments:number}; createdAt:string; updatedAt:string; }
export interface ScheduledPost { id:string; userId:string; companyId:string; contentItemId:string; platforms:string[]; scheduledFor:string; status:'scheduled'|'publishing'|'published'|'failed'|'cancelled'|'requires_review'|'planned'; isPlanning?:boolean; publishedAt?:string; errorMessage?:string; autopilotGenerated?:boolean; retryCount?:number; publicationResults?:Array<{platform:string;provider?:string;success:boolean;externalId?:string;error?:string;externalState?:'confirmed_success'|'confirmed_failed'|'unknown';retrySafe?:boolean}>; createdAt:string; updatedAt?:string; }
export interface SocialConnection { id:string; userId:string; companyId:string; provider:'instagram'|'facebook'|'tiktok'|'youtube'|'linkedin'|'pinterest'|'x'; accountName:string; accountId:string; scopes:string[]; expiresAt?:string|null; connectedAt:string; status:'connected'|'expired'|'error'|'token_expired'; }
export interface SeoReport { id:string; userId:string; companyId:string; url:string; title?:string; metaDescription?:string; h1s:string[]; h2s:string[]; keywords:{word:string;count:number;density:string}[]; seoScore:number; criteriaBreakdown:{hasTitle:boolean;titleLengthValid:boolean;hasDescription:boolean;descriptionLengthValid:boolean;hasH1:boolean;singleH1:boolean;hasKeywordsInHeadings:boolean;contentLengthSufficient:boolean;hasHttps:boolean;hasCanonical:boolean}; recommendations:string[]; generatedOutline?:string[]; faqSuggestions?:{question:string;answer:string}[]; createdAt:string; }
export interface BlogPost { id:string; title:string; slug:string; summary:string; content:string; featuredImageUrl?:string; author:string; category:string; tags:string[]; companyId?:string; isFrocMagazineSponsored?:boolean; seoTitle?:string; seoDescription?:string; status:'published'|'draft'|'archived'; publishedAt?:string; createdAt:string; updatedAt?:string; }
export interface AutopilotConfig { id:string; userId:string; companyId:string; enabled:boolean; mode:'manual_approval'|'automatic'; frequency:'daily'|'3_times_week'|'weekly'; preferredDays:number[]; preferredHours:number[]; targetPlatforms:string[]; primaryGoal:string; lastRunAt?:string; nextRunAt?:string; usageMonth?:string; }

export interface VideoJob {
  id: string;
  userId: string;
  companyId: string;
  title: string;
  prompt: string;
  sourcePrompt?: string;
  finalPrompt?: string;
  preset: 'demo_720p' | 'pro_1080p' | 'cinema_4k';
  resolution?: '720p' | '1080p' | '4k';
  requestedResolution?: '720p' | '1080p' | '4k';
  actualResolution?: '720p' | '1080p' | '4k';
  durationSeconds?: number;
  aspectRatio: '9:16' | '16:9';
  status: 'pending' | 'processing' | 'finalizing' | 'completed' | 'failed';
  progressPct: number;
  videoUrl?: string;
  storagePath?: string;
  contentItemId?: string;
  error?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}


// ==========================================
// ALMA X - REGENTE DIGITAL DATA CONTRACTS
// ==========================================

export type AlmaState =
  | 'IDLE'
  | 'LISTENING'
  | 'THINKING'
  | 'SEARCHING'
  | 'ANALYZING'
  | 'PLANNING'
  | 'EXECUTING'
  | 'WAITING_APPROVAL'
  | 'SPEAKING'
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR';

export type AlmaAgentType =
  | 'RESEARCH'
  | 'STRATEGY'
  | 'BUSINESS'
  | 'MARKETING'
  | 'SOCIAL'
  | 'ARCHITECT'
  | 'CREATIVE'
  | 'CODE'
  | 'DATA'
  | 'FINANCE'
  | 'PROJECT'
  | 'PRODUCTIVITY'
  | 'WEB'
  | 'HOME'
  | 'MAPS'
  | 'VISION'
  | 'MEDIA';

export type AlmaRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type AlmaAutonomyLevel = 'manual' | 'assisted' | 'automatic' | 'agent';

export interface AlmaIntent {
  rawPrompt: string;
  category:
    | 'CONTROL_HOME'
    | 'EXECUTE_MARKETING'
    | 'RESEARCH_WEB'
    | 'STRATEGY_DECISION'
    | 'BUSINESS_CONSULTING'
    | 'CREATIVE_PRODUCTION'
    | 'CODE_DEVELOPMENT'
    | 'DATA_ANALYTICS'
    | 'FINANCIAL_PLAN'
    | 'PROJECT_MANAGEMENT'
    | 'PRODUCTIVITY_REMINDER'
    | 'MAPS_MOBILITY'
    | 'VISION_INSPECTION'
    | 'SOCIAL_PUBLISHING'
    | 'MEDIA_CREATION'
    | 'GENERAL_CONVERSATION';
  goal: string;
  targetDomain: 'HOME' | 'BUSINESS' | 'MARKETING' | 'INTERNET' | 'CREATIVE' | 'PERSONAL';
  requiredAgents: AlmaAgentType[];
  riskLevel: AlmaRiskLevel;
  requiresApproval: boolean;
  actionSequence: Array<{
    step: number;
    agent: AlmaAgentType;
    action: string;
    target?: string;
    params?: Record<string, any>;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_approval';
    output?: string;
  }>;
  confidenceScore: number;
  explanation?: string;
}

export interface AlmaMemory {
  id: string;
  userId: string;
  type: 'short_term' | 'episodic' | 'semantic' | 'preference' | 'project' | 'operational';
  category: string;
  key: string;
  value: string;
  metadata?: Record<string, any>;
  importance: number; // 1 to 10
  createdAt: string;
  updatedAt?: string;
}

export interface SmartDevice {
  id: string;
  name: string;
  room: 'sala' | 'quarto' | 'cozinha' | 'escritorio' | 'externo' | 'garagem';
  type: 'light' | 'tv' | 'ac' | 'curtain' | 'lock' | 'audio' | 'camera' | 'sensor';
  protocol: 'matter' | 'wifi' | 'bluetooth' | 'zigbee' | 'home_assistant';
  state: {
    power: boolean;
    brightness?: number;
    temperature?: number;
    color?: string;
    position?: number; // 0 (fechado) - 100 (aberto)
    volume?: number;
    isLocked?: boolean;
    channel?: string;
  };
  capabilities: string[];
  online: boolean;
  lastUpdated: string;
}

export interface HomeScene {
  id: string;
  name: string;
  icon: string;
  description: string;
  actions: Array<{
    deviceId: string;
    targetState: Record<string, any>;
  }>;
  isActive?: boolean;
}

export interface AlmaOrchestrationPlan {
  id: string;
  goal: string;
  intent: AlmaIntent;
  status: 'planning' | 'in_progress' | 'waiting_approval' | 'completed' | 'failed';
  currentStepIndex: number;
  steps: Array<{
    id: string;
    agent: AlmaAgentType;
    title: string;
    description: string;
    toolUsed?: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_approval';
    result?: string;
    startedAt?: string;
    completedAt?: string;
  }>;
  finalResult?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlmaPersonalityConfig {
  tone: 'objective' | 'strategic' | 'futuristic' | 'empathic';
  autonomy: AlmaAutonomyLevel;
  proactivity: 'quiet' | 'balanced' | 'proactive';
  voiceSpeed: number;
  voiceGender: 'neutral' | 'female' | 'male';
  soundFxEnabled: boolean;
  particlesIntensity: 'low' | 'medium' | 'high';
}


