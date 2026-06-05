import React, { useState } from 'react';
import { ShieldCheck, FlaskConical, Database, HeartHandshake, Mail, Loader2 } from 'lucide-react';
import { Locale } from '@/types';

// One-time in-app informed-consent / enrollment gate shown to a student before they first use the
// platform as a research participant. On agree → records consent + assigns a balanced A/B condition
// (server-side, via enroll_in_study). On decline → they use the platform as a non-participant.
//
// ⚠️ RESEARCH TEAM: review and edit the consent text + CONTACT below to match your actual IRB /
// ethics approval, principal investigator, and contact details before the pilot. Bump CONSENT_VERSION
// in StudentView if the wording changes materially.

const CONTACT = 'zhenhai@m.scnu.edu.cn';

const T = {
  'zh-CN': {
    badge: '研究知情同意',
    title: '关于参与本学习研究',
    intro:
      '欢迎使用本 AI 学术导师平台。该平台同时是一项关于「AI 导师如何支持学习与思考」研究的一部分。开始之前，请阅读以下说明，并选择是否参与研究。',
    s1t: '研究目的',
    s1: '了解不同的 AI 辅导方式如何影响你的学习过程与独立思考，从而改进面向教育的 AI 智能体设计。',
    s2t: '参与意味着什么',
    s2: '你像平常一样使用平台、与 AI 导师对话。系统会记录你的对话内容与交互行为（提问、追问、使用的功能等）用于研究分析。除此之外没有额外任务。',
    s3t: '数据与隐私',
    s3: '用于研究的数据会去标识化（以编号代替你的身份）。研究结果可能以匿名、汇总的形式发表于学术论文，不会包含可识别你个人的信息。',
    s4t: '自愿与退出',
    s4: '参与完全自愿。你可以选择不参与而仅使用平台；若参与，也可随时联系研究团队退出。是否参与或退出都不会影响你正常使用平台、也不影响任何评价或成绩。',
    s5t: '联系方式',
    s5: '如对本研究有任何疑问，请联系研究团队：',
    check: '我已阅读并理解上述说明。',
    agree: '同意并参与研究',
    decline: '不参与，仅使用平台',
    foot: '点击「同意并参与」即表示你自愿同意参与本研究。',
  },
  en: {
    badge: 'Research informed consent',
    title: 'About taking part in this learning study',
    intro:
      'Welcome to this AI academic-tutor platform. It is also part of a study on how AI tutors support learning and thinking. Please read the information below and choose whether to take part.',
    s1t: 'Purpose',
    s1: 'To understand how different AI-tutoring styles affect your learning and independent thinking, so we can improve the design of educational AI agents.',
    s2t: 'What taking part involves',
    s2: 'You use the platform and talk with the AI tutor as you normally would. Your conversations and interactions (questions, follow-ups, features used) are recorded for research analysis. There are no extra tasks.',
    s3t: 'Data & privacy',
    s3: 'Research data is de-identified (a code replaces your identity). Findings may be published in anonymized, aggregated form in academic papers and will not contain information that identifies you.',
    s4t: 'Voluntary & withdrawal',
    s4: 'Participation is entirely voluntary. You may use the platform without taking part; if you take part, you can withdraw any time by contacting the research team. Either choice has no effect on your use of the platform or any grades.',
    s5t: 'Contact',
    s5: 'If you have any questions about this study, contact the research team:',
    check: 'I have read and understood the information above.',
    agree: 'Agree & take part',
    decline: 'Use the platform without taking part',
    foot: 'Clicking “Agree & take part” means you voluntarily consent to participate.',
  },
} as const;

interface Props {
  locale: Locale;
  onRespond: (consent: boolean) => Promise<void> | void;
}

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="flex gap-3">
    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">{icon}</div>
    <div>
      <h3 className="mb-1 text-sm font-semibold text-slate-800">{title}</h3>
      <p className="text-[13px] leading-relaxed text-slate-600">{children}</p>
    </div>
  </div>
);

const ConsentEnrollmentPage: React.FC<Props> = ({ locale, onRespond }) => {
  const t = T[locale === 'en' ? 'en' : 'zh-CN'];
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState<null | 'agree' | 'decline'>(null);

  const respond = async (consent: boolean) => {
    if (busy) return;
    setBusy(consent ? 'agree' : 'decline');
    try {
      await onRespond(consent);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-sky-400 text-white shadow-sm">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-600">{t.badge}</span>
            <h2 className="text-lg font-bold text-slate-900">{t.title}</h2>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <p className="text-[13px] leading-relaxed text-slate-600">{t.intro}</p>
          <Section icon={<FlaskConical size={16} />} title={t.s1t}>{t.s1}</Section>
          <Section icon={<HeartHandshake size={16} />} title={t.s2t}>{t.s2}</Section>
          <Section icon={<Database size={16} />} title={t.s3t}>{t.s3}</Section>
          <Section icon={<ShieldCheck size={16} />} title={t.s4t}>{t.s4}</Section>
          <Section icon={<Mail size={16} />} title={t.s5t}>
            {t.s5}{' '}
            <a href={`mailto:${CONTACT}`} className="font-medium text-blue-600 hover:underline">{CONTACT}</a>
          </Section>
        </div>

        {/* Sticky footer */}
        <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <label className="mb-3 flex cursor-pointer items-start gap-2.5 text-[13px] text-slate-700">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>{t.check}</span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              onClick={() => respond(true)}
              disabled={!agreed || busy !== null}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === 'agree' && <Loader2 size={15} className="animate-spin" />}
              {t.agree}
            </button>
            <button
              onClick={() => respond(false)}
              disabled={busy !== null}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              {busy === 'decline' && <Loader2 size={15} className="animate-spin" />}
              {t.decline}
            </button>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">{t.foot}</p>
        </div>
      </div>
    </div>
  );
};

export default ConsentEnrollmentPage;
