export interface BlogArticleSection {
  h2: string;
  content: string;
  h3s?: Array<{ h3: string; content: string }>;
}

export interface BlogFaqItem {
  question: string;
  answer: string;
}

export interface SocialRepurposePack {
  instagram: { caption: string; hashtags: string[]; utmUrl: string };
  facebook: { postText: string; utmUrl: string };
  linkedin: { postText: string; professionalTakeaway: string; utmUrl: string };
  twitter: { thread: string[]; utmUrl: string };
}

export interface PortalBlogArticle {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  metaDescription: string;
  keywords: string[];
  category: string;
  targetAudience: string;
  searchIntent: 'informational' | 'commercial' | 'navigational' | 'transactional';
  coverImage: string;
  coverImageAlt: string;
  readingTimeMinutes: number;
  readTime?: string;
  contentMarkdown: string;
  sections: BlogArticleSection[];
  keyTakeaways: string[];
  keyTakeaway?: string;
  quote?: { text: string; author: string };
  faq: BlogFaqItem[];
  relatedProjectId: string;
  relatedProjectName: string;
  relatedProjectSlug: string;
  relatedProjectUrl: string;
  relatedPlayStoreUrl?: string;
  canonicalUrl: string;
  schemaJsonLd: Record<string, any>;
  socialRepurpose: SocialRepurposePack;
  author: {
    name: string;
    role: string;
    avatar: string;
    bio: string;
  };
  views: number;
  likes: number;
  shares: number;
  clicksWebsite: number;
  clicksPlayStore: number;
  publishedAt: string;
  updatedAt: string;
  status: 'published' | 'pending_approval' | 'draft' | 'archived';
  indexNowNotified?: boolean;
  featured?: boolean;
}
