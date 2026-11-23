'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CompanyProfile } from '@/schemas';
import { WarningBanner } from './ui-bits';

const REGION_ITEMS = { capital: '수도권', non_capital: '비수도권' } as const;
const SIZE_ITEMS = { sme: '중소기업', middle: '중견기업' } as const;
const YEAR_ITEMS = { 2024: '2024년', 2025: '2025년', 2026: '2026년' } as const;

const INDUSTRY_PRESETS = ['제조업', '도소매업', '서비스업', '건설업', 'IT·소프트웨어', '기타'];

export function CompanyProfileForm({
  company,
  onChange,
}: {
  company: CompanyProfile;
  onChange: (next: CompanyProfile) => void;
}) {
  const patch = (partial: Partial<CompanyProfile>) =>
    onChange({ ...company, ...partial, updatedAt: new Date().toISOString() });

  return (
    <div className="space-y-4">
      <WarningBanner title="회사 정보는 계산 기준값입니다" tone="info">
        <p>지역·기업 규모·과세연도에 따라 적용되는 공제 한도와 단가가 달라집니다.</p>
        <p>입력값은 서버로 전송되지 않고 브라우저(localStorage)에만 저장됩니다.</p>
      </WarningBanner>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="company-name">회사명</Label>
          <Input
            id="company-name"
            value={company.name}
            placeholder="(주)공제레이더"
            onChange={(event) => patch({ name: event.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="company-industry">업종</Label>
          <Input
            id="company-industry"
            list="industry-presets"
            value={company.industry}
            placeholder="제조업"
            onChange={(event) => patch({ industry: event.target.value })}
          />
          <datalist id="industry-presets">
            {INDUSTRY_PRESETS.map((industry) => (
              <option key={industry} value={industry} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label>소재지 구분</Label>
          <Select
            items={REGION_ITEMS}
            value={company.region}
            onValueChange={(value) =>
              patch({ region: (value as CompanyProfile['region']) ?? 'non_capital' })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="capital">수도권</SelectItem>
              <SelectItem value="non_capital">비수도권</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>기업 규모</Label>
          <Select
            items={SIZE_ITEMS}
            value={company.size}
            onValueChange={(value) =>
              patch({ size: (value as CompanyProfile['size']) ?? 'sme' })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sme">중소기업</SelectItem>
              <SelectItem value="middle">중견기업</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>과세연도</Label>
          <Select
            items={YEAR_ITEMS}
            value={String(company.targetYear)}
            onValueChange={(value) => patch({ targetYear: Number(value) || 2026 })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024년</SelectItem>
              <SelectItem value="2025">2025년</SelectItem>
              <SelectItem value="2026">2026년</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="calculated-tax">산출세액 (원)</Label>
          <Input
            id="calculated-tax"
            inputMode="numeric"
            value={company.calculatedTax.toLocaleString('ko-KR')}
            onChange={(event) =>
              patch({ calculatedTax: Number(event.target.value.replace(/[^\d]/g, '')) || 0 })
            }
          />
        </div>
      </div>
    </div>
  );
}