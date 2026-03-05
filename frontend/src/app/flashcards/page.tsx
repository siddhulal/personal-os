"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Layers,
  Plus,
  Play,
  RotateCcw,
  Trash2,
  Pencil,
  ChevronLeft,
  BookOpen,
  Brain,
  Zap,
  Check,
} from "lucide-react";
import {
  fetchFlashcards,
  fetchDueCards,
  fetchFlashcardStats,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  reviewFlashcard,
} from "@/lib/api/flashcards";
import type { Flashcard, FlashcardStats, FlashcardRating, PageResponse } from "@/types";
import { cn } from "@/lib/utils";

type View = "deck" | "review" | "manage";

const RATING_CONFIG: {
  rating: FlashcardRating;
  label: string;
  color: string;
  key: string;
}[] = [
  { rating: 1, label: "Again", color: "bg-red-500 hover:bg-red-600", key: "1" },
  { rating: 2, label: "Hard", color: "bg-orange-500 hover:bg-orange-600", key: "2" },
  { rating: 3, label: "Good", color: "bg-blue-500 hover:bg-blue-600", key: "3" },
  { rating: 4, label: "Easy", color: "bg-green-500 hover:bg-green-600", key: "4" },
];

const STATE_BADGE: Record<number, { label: string; color: string }> = {
  0: { label: "New", color: "bg-blue-500/10 text-blue-500" },
  1: { label: "Learning", color: "bg-orange-500/10 text-orange-500" },
  2: { label: "Review", color: "bg-green-500/10 text-green-500" },
  3: { label: "Relearning", color: "bg-red-500/10 text-red-500" },
};

export default function FlashcardsPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("deck");
  const [flipped, setFlipped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewDeck, setReviewDeck] = useState<string | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [editCard, setEditCard] = useState<Flashcard | null>(null);
  const [deleteCard, setDeleteCard] = useState<Flashcard | null>(null);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [newDeck, setNewDeck] = useState("General");
  const [reviewComplete, setReviewComplete] = useState(false);

  const { data: stats } = useQuery<FlashcardStats>({
    queryKey: ["flashcard-stats"],
    queryFn: fetchFlashcardStats,
  });

  const { data: allCards } = useQuery<PageResponse<Flashcard>>({
    queryKey: ["flashcards"],
    queryFn: () => fetchFlashcards(0, 200),
  });

  const { data: dueCards = [], refetch: refetchDue } = useQuery<Flashcard[]>({
    queryKey: ["flashcards-due", reviewDeck],
    queryFn: () => fetchDueCards(reviewDeck),
    enabled: view === "review",
  });

  const createMutation = useMutation({
    mutationFn: createFlashcard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });
      queryClient.invalidateQueries({ queryKey: ["flashcard-stats"] });
      toast.success("Card created");
      setCreateOpen(false);
      setNewFront("");
      setNewBack("");
    },
    onError: () => toast.error("Failed to create card"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { front: string; back: string; deck?: string } }) =>
      updateFlashcard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });
      toast.success("Card updated");
      setEditCard(null);
    },
    onError: () => toast.error("Failed to update card"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFlashcard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });
      queryClient.invalidateQueries({ queryKey: ["flashcard-stats"] });
      toast.success("Card deleted");
      setDeleteCard(null);
    },
    onError: () => toast.error("Failed to delete card"),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: FlashcardRating }) =>
      reviewFlashcard(id, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcard-stats"] });
      setFlipped(false);
      if (currentIndex + 1 >= dueCards.length) {
        setReviewComplete(true);
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    onError: () => toast.error("Failed to submit review"),
  });

  function startReview(deck?: string) {
    setReviewDeck(deck);
    setCurrentIndex(0);
    setFlipped(false);
    setReviewComplete(false);
    setView("review");
  }

  function handleRate(rating: FlashcardRating) {
    const card = dueCards[currentIndex];
    if (!card) return;
    reviewMutation.mutate({ id: card.id, rating });
  }

  const currentCard = dueCards[currentIndex];

  // Deck view
  if (view === "deck") {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Layers className="h-6 w-6" /> Flashcards
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Spaced repetition for long-term memory
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setView("manage")}>
                <BookOpen className="h-4 w-4 mr-2" /> Manage
              </Button>
              <Button size="sm" onClick={() => { setNewFront(""); setNewBack(""); setNewDeck("General"); setCreateOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> New Card
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Cards" value={stats?.totalCards ?? 0} icon={<Layers className="h-5 w-5" />} />
            <StatCard label="Due Now" value={stats?.dueCards ?? 0} icon={<Zap className="h-5 w-5 text-orange-500" />} accent />
            <StatCard label="Mastered" value={stats?.masteredCards ?? 0} icon={<Brain className="h-5 w-5 text-green-500" />} />
            <StatCard label="Decks" value={stats?.decks?.length ?? 0} icon={<BookOpen className="h-5 w-5 text-blue-500" />} />
          </div>

          {/* Start Review */}
          {(stats?.dueCards ?? 0) > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 text-center">
              <h2 className="text-lg font-semibold mb-2">
                You have {stats?.dueCards} cards to review
              </h2>
              <Button onClick={() => startReview()} className="gap-2">
                <Play className="h-4 w-4" /> Start Review
              </Button>
            </div>
          )}

          {/* Decks */}
          {stats?.decks && stats.decks.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Decks</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stats.decks.map((deck) => (
                  <button
                    key={deck}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                    onClick={() => startReview(deck)}
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{deck}</span>
                    </div>
                    <Play className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {(stats?.totalCards ?? 0) === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium">No flashcards yet</p>
              <p className="text-sm mt-1 mb-4">Create cards to start building long-term memory</p>
              <Button onClick={() => { setNewFront(""); setNewBack(""); setNewDeck("General"); setCreateOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Create First Card
              </Button>
            </div>
          )}
        </div>

        {/* Create / Edit Dialog */}
        <CardDialog
          open={createOpen || !!editCard}
          onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditCard(null); } }}
          title={editCard ? "Edit Card" : "New Flashcard"}
          front={editCard ? editCard.front : newFront}
          back={editCard ? editCard.back : newBack}
          deck={editCard ? editCard.deck : newDeck}
          onFrontChange={(v) => editCard ? setEditCard({ ...editCard, front: v }) : setNewFront(v)}
          onBackChange={(v) => editCard ? setEditCard({ ...editCard, back: v }) : setNewBack(v)}
          onDeckChange={(v) => editCard ? setEditCard({ ...editCard, deck: v }) : setNewDeck(v)}
          onSubmit={() => {
            if (editCard) {
              updateMutation.mutate({ id: editCard.id, data: { front: editCard.front, back: editCard.back, deck: editCard.deck } });
            } else {
              createMutation.mutate({ front: newFront, back: newBack, deck: newDeck });
            }
          }}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </AppShell>
    );
  }

  // Review view
  if (view === "review") {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="sm" onClick={() => { setView("deck"); refetchDue(); }}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <span className="text-sm text-muted-foreground">
              {reviewComplete ? "Complete!" : `${currentIndex + 1} / ${dueCards.length}`}
            </span>
          </div>

          {reviewComplete ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Review Complete!</h2>
              <p className="text-muted-foreground mb-6">
                You reviewed {dueCards.length} card{dueCards.length !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setView("deck")}>
                  Back to Deck
                </Button>
                <Button onClick={() => { setCurrentIndex(0); setFlipped(false); setReviewComplete(false); refetchDue(); }}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Review Again
                </Button>
              </div>
            </div>
          ) : dueCards.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Check className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium">No cards due</p>
              <p className="text-sm mt-1">Come back later for more reviews</p>
            </div>
          ) : currentCard ? (
            <div>
              {/* Flashcard */}
              <div
                className="relative cursor-pointer select-none"
                style={{ perspective: "1000px" }}
                onClick={() => setFlipped(!flipped)}
              >
                <div
                  className="transition-transform duration-500"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  {/* Front */}
                  <div
                    className="bg-card border rounded-xl p-8 min-h-[280px] flex flex-col items-center justify-center"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <span className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">
                      {currentCard.deck} · {STATE_BADGE[currentCard.state]?.label}
                    </span>
                    <p className="text-xl text-center leading-relaxed whitespace-pre-wrap">{currentCard.front}</p>
                    <p className="text-xs text-muted-foreground mt-6">Click to flip</p>
                  </div>

                  {/* Back */}
                  <div
                    className="bg-card border rounded-xl p-8 min-h-[280px] flex flex-col items-center justify-center absolute inset-0"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <span className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">Answer</span>
                    <p className="text-xl text-center leading-relaxed whitespace-pre-wrap">{currentCard.back}</p>
                  </div>
                </div>
              </div>

              {/* Rating buttons */}
              {flipped && (
                <div className="flex gap-3 justify-center mt-6">
                  {RATING_CONFIG.map((r) => (
                    <Button
                      key={r.rating}
                      className={cn("flex-1 max-w-[120px] text-white", r.color)}
                      onClick={() => handleRate(r.rating)}
                      disabled={reviewMutation.isPending}
                    >
                      {r.label}
                      <span className="text-xs opacity-70 ml-1">({r.key})</span>
                    </Button>
                  ))}
                </div>
              )}

              <p className="text-center text-xs text-muted-foreground mt-4">
                {flipped ? "Rate how well you remembered" : "Think of the answer, then click to reveal"}
              </p>
            </div>
          ) : null}
        </div>
      </AppShell>
    );
  }

  // Manage view
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setView("deck")}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h1 className="text-xl font-bold">All Cards</h1>
          </div>
          <Button size="sm" onClick={() => { setNewFront(""); setNewBack(""); setNewDeck("General"); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New Card
          </Button>
        </div>

        <div className="space-y-2">
          {allCards?.content.map((card) => {
            const badge = STATE_BADGE[card.state] ?? STATE_BADGE[0];
            return (
              <div
                key={card.id}
                className="border rounded-lg p-4 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", badge.color)}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{card.deck}</span>
                    {card.reps > 0 && (
                      <span className="text-xs text-muted-foreground">{card.reps} reviews</span>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">{card.front}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{card.back}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setEditCard(card)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteCard(card)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}

          {(allCards?.content.length ?? 0) === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No cards yet</p>
            </div>
          )}
        </div>
      </div>

      <CardDialog
        open={createOpen || !!editCard}
        onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditCard(null); } }}
        title={editCard ? "Edit Card" : "New Flashcard"}
        front={editCard ? editCard.front : newFront}
        back={editCard ? editCard.back : newBack}
        deck={editCard ? editCard.deck : newDeck}
        onFrontChange={(v) => editCard ? setEditCard({ ...editCard, front: v }) : setNewFront(v)}
        onBackChange={(v) => editCard ? setEditCard({ ...editCard, back: v }) : setNewBack(v)}
        onDeckChange={(v) => editCard ? setEditCard({ ...editCard, deck: v }) : setNewDeck(v)}
        onSubmit={() => {
          if (editCard) {
            updateMutation.mutate({ id: editCard.id, data: { front: editCard.front, back: editCard.back, deck: editCard.deck } });
          } else {
            createMutation.mutate({ front: newFront, back: newBack, deck: newDeck });
          }
        }}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteCard}
        onOpenChange={(open) => { if (!open) setDeleteCard(null); }}
        title="Delete Flashcard"
        description="Are you sure you want to delete this card? This action cannot be undone."
        onConfirm={() => { if (deleteCard) deleteMutation.mutate(deleteCard.id); }}
        loading={deleteMutation.isPending}
      />
    </AppShell>
  );
}

// ==================== Subcomponents ====================

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={cn("border rounded-lg p-4", accent && value > 0 && "border-primary/30 bg-primary/5")}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function CardDialog({
  open,
  onOpenChange,
  title,
  front,
  back,
  deck,
  onFrontChange,
  onBackChange,
  onDeckChange,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  front: string;
  back: string;
  deck: string;
  onFrontChange: (v: string) => void;
  onBackChange: (v: string) => void;
  onDeckChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Front (Question)</Label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={front}
              onChange={(e) => onFrontChange(e.target.value)}
              placeholder="What is the question?"
            />
          </div>
          <div className="space-y-2">
            <Label>Back (Answer)</Label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={back}
              onChange={(e) => onBackChange(e.target.value)}
              placeholder="What is the answer?"
            />
          </div>
          <div className="space-y-2">
            <Label>Deck</Label>
            <Input
              value={deck}
              onChange={(e) => onDeckChange(e.target.value)}
              placeholder="General"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!front.trim() || !back.trim() || loading}
            onClick={onSubmit}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
