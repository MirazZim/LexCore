import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ArrowLeft, X, Sparkles, Loader2, Briefcase, MessageCircle, Sun, GraduationCap } from 'lucide-react';
import { useAddWord } from '@/hooks/useWords';
import { generateDefinition, generateExampleSentences, generateCollocations, generateWord } from '@/lib/llm';
import type { GenerationStyle } from '@/lib/llm';
import type { Register } from '@/lib/types';

const registers: { value: Register; label: string }[] = [
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'literary', label: 'Literary' },
  { value: 'slang', label: 'Slang' },
];

const generationStyles: {
  value: GenerationStyle;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  { value: 'formal',  label: 'Formal',      desc: 'Business & academic',    icon: Briefcase },
  { value: 'casual',  label: 'Casual',       desc: 'Friendly conversation',  icon: MessageCircle },
  { value: 'daily',   label: 'Daily Usage',  desc: 'Everyday scenarios',     icon: Sun },
  { value: 'ielts',   label: 'IELTS',        desc: 'Band 7–9 academic',      icon: GraduationCap },
];

export default function AddWordPage() {
  const navigate = useNavigate();
  const [word, setWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');
  const [collocations, setCollocations] = useState<string[]>([]);
  const [collocationInput, setCollocationInput] = useState('');
  const [register, setRegister] = useState<Register>('formal');
  const [generationStyle, setGenerationStyle] = useState<GenerationStyle>('daily');
  const [loadingWord, setLoadingWord] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [loadingDefinition, setLoadingDefinition] = useState(false);
  const [loadingExample, setLoadingExample] = useState(false);
  const [loadingCollocations, setLoadingCollocations] = useState(false);
  const addWord = useAddWord();

  const handleAutoWord = async (style: GenerationStyle) => {
    setShowStylePicker(false);
    setGenerationStyle(style);
    setLoadingWord(true);
    try {
      const suggested = await generateWord(word.trim(), style);
      setWord(suggested);
      toast.success('Word suggested!');
    } catch {
      toast.error('Failed to suggest word');
    } finally {
      setLoadingWord(false);
    }
  };

  const handleAutoDefinition = async () => {
    if (!word.trim()) { toast.error('Enter a word first'); return; }
    setLoadingDefinition(true);
    try {
      const result = await generateDefinition(word.trim(), generationStyle);
      setDefinition(result.definition);
      toast.success('Definition generated!');
    } catch {
      toast.error('Failed to generate definition');
    } finally {
      setLoadingDefinition(false);
    }
  };

  const handleAutoExample = async () => {
    if (!word.trim()) { toast.error('Enter a word first'); return; }
    if (!definition.trim()) { toast.error('Add a definition first'); return; }
    setLoadingExample(true);
    try {
      const sentences = await generateExampleSentences(word.trim(), definition.trim(), generationStyle);
      setExampleSentence(sentences[0]);
      toast.success('Example generated!');
    } catch {
      toast.error('Failed to generate example');
    } finally {
      setLoadingExample(false);
    }
  };

  const handleAutoCollocations = async () => {
    if (!word.trim()) { toast.error('Enter a word first'); return; }
    if (!definition.trim()) { toast.error('Add a definition first'); return; }
    setLoadingCollocations(true);
    try {
      const results = await generateCollocations(word.trim(), definition.trim(), generationStyle);
      const unique = results.filter(c => !collocations.includes(c));
      setCollocations(prev => [...prev, ...unique]);
      toast.success('Collocations generated!');
    } catch {
      toast.error('Failed to generate collocations');
    } finally {
      setLoadingCollocations(false);
    }
  };

  const addCollocation = () => {
    const trimmed = collocationInput.trim();
    if (trimmed && !collocations.includes(trimmed)) {
      setCollocations(prev => [...prev, trimmed]);
      setCollocationInput('');
    }
  };

  const removeCollocation = (index: number) => {
    setCollocations(prev => prev.filter((_, i) => i !== index));
  };

  const handleCollocationKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCollocation();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !definition.trim()) return;

    try {
      await addWord.mutateAsync({
        word: word.trim(),
        definition: definition.trim(),
        example_sentence: exampleSentence.trim() || undefined,
        register,
        collocations,
      });
      toast.success(`"${word}" added to your library!`, {
        action: { label: 'Go to Library', onClick: () => navigate('/library') },
      });
      setWord('');
      setDefinition('');
      setExampleSentence('');
      setCollocations([]);
      setCollocationInput('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save word');
    }
  };


  return (
    <AppLayout>
      <div className="px-4 pt-6 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-2xl font-bold">Add Word</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Word input + style picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="word">Word</Label>
                <button
                  type="button"
                  onClick={() => setShowStylePicker(v => !v)}
                  disabled={loadingWord}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingWord ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {loadingWord ? 'Suggesting...' : 'Suggest Word'}
                </button>
              </div>
              <Input
                id="word"
                placeholder="e.g., type a topic hint or leave blank…"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                required
              />
              {showStylePicker && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 gap-2 pt-1"
                >
                  {generationStyles.map(({ value, label, desc, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleAutoWord(value)}
                      className="flex items-center gap-3 rounded-xl border border-border bg-secondary px-4 py-3 text-left hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-sm font-semibold leading-none">{label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Definition with AI button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="definition">Definition</Label>
                <button
                  type="button"
                  onClick={handleAutoDefinition}
                  disabled={loadingDefinition || !word.trim()}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingDefinition ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {loadingDefinition ? 'Generating...' : 'Auto-fill'}
                </button>
              </div>
              <Textarea
                id="definition"
                placeholder="What does this word mean?"
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                required
              />
            </div>

            {/* Example sentence with AI button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="example">Example Sentence (optional)</Label>
                <button
                  type="button"
                  onClick={handleAutoExample}
                  disabled={loadingExample || !word.trim() || !definition.trim()}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingExample ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {loadingExample ? 'Generating...' : 'Generate'}
                </button>
              </div>
              <Textarea
                id="example"
                placeholder="Where did you first see this word?"
                value={exampleSentence}
                onChange={(e) => setExampleSentence(e.target.value)}
              />
            </div>

            {/* Collocations */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="collocations">Collocations (optional)</Label>
                <button
                  type="button"
                  onClick={handleAutoCollocations}
                  disabled={loadingCollocations || !word.trim() || !definition.trim()}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingCollocations ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {loadingCollocations ? 'Generating...' : 'Auto-fill'}
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  id="collocations"
                  placeholder="e.g., make an effort"
                  value={collocationInput}
                  onChange={(e) => setCollocationInput(e.target.value)}
                  onKeyDown={handleCollocationKeyDown}
                />
                <Button type="button" variant="secondary" onClick={addCollocation} disabled={!collocationInput.trim()}>
                  Add
                </Button>
              </div>
              {collocations.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {collocations.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm">
                      {c}
                      <button type="button" onClick={() => removeCollocation(i)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Register */}
            <div className="space-y-2">
              <Label>Register</Label>
              <div className="flex flex-wrap gap-2">
                {registers.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRegister(r.value)}
                    className={cn(
                      'rounded-full px-4 py-2 text-sm font-medium border transition-all',
                      register === r.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary text-secondary-foreground border-border hover:border-primary/50'
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full h-12 rounded-2xl font-display font-semibold" disabled={addWord.isPending}>
              {addWord.isPending ? 'Saving...' : 'Save Word'}
            </Button>
          </form>
        </motion.div>
      </div>
    </AppLayout>
  );
}
