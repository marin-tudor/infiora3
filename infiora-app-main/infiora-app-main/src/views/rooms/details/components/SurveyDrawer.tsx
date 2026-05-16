"use client";
import React, { useState } from "react";
import {
  Drawer,
  Typography,
  Stack,
  Button,
  Box,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  LinearProgress,
} from "@mui/material";
import { Rating } from "react-simple-star-rating";
import { toast } from "react-toastify";
import { IRoom, ISurveyQuestion } from "@/types";
import { useRoom } from "@/contexts/RoomContext";
import { getSurveyT } from "@/utils/surveyTranslations";

interface SurveyDrawerProps {
  room: IRoom;
  onClose: () => void;
  /** If rating is provided (from FeedbackDrawer flow), survey answers are sent together with feedback submission */
  prefillRating?: number;
  prefillEmail?: string;
  prefillMessage?: string;
}

type SurveyAnswer = string | string[] | number | boolean | Record<string, string>;

const QuestionRenderer = ({
  question,
  answer,
  setAnswer,
  t,
}: {
  question: ISurveyQuestion;
  answer: SurveyAnswer | undefined;
  setAnswer: (val: SurveyAnswer) => void;
  t: ReturnType<typeof getSurveyT>;
}) => {
  switch (question.type) {
    case "rating":
      return (
        <Stack alignItems="center">
          <Rating
            initialValue={(answer as number) || 0}
            onClick={(val) => setAnswer(val)}
            size={28}
            allowFraction={false}
            fillColor="#FFD54F"
            emptyColor="#E0E0E0"
            SVGstyle={{ display: "inline-block" }}
          />
        </Stack>
      );

    case "yes_no":
      return (
        <RadioGroup
          value={answer ?? ""}
          onChange={(e) => setAnswer(e.target.value)}
          row
          sx={{ justifyContent: "center", gap: 3 }}
        >
          <FormControlLabel value="yes" control={<Radio />} label={t.yes} />
          <FormControlLabel value="no" control={<Radio />} label={t.no} />
        </RadioGroup>
      );

    case "single_choice":
      return (
        <RadioGroup
          value={answer ?? ""}
          onChange={(e) => setAnswer(e.target.value)}
        >
          {(question.options ?? []).map((opt) => (
            <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />
          ))}
        </RadioGroup>
      );

    case "multi_choice": {
      const selected = (answer as string[]) ?? [];
      return (
        <Stack>
          {(question.options ?? []).map((opt) => (
            <FormControlLabel
              key={opt}
              label={opt}
              control={
                <Checkbox
                  checked={selected.includes(opt)}
                  onChange={(e) => {
                    if (e.target.checked) setAnswer([...selected, opt]);
                    else setAnswer(selected.filter((s) => s !== opt));
                  }}
                />
              }
            />
          ))}
        </Stack>
      );
    }

    case "open_text":
      return (
        <TextField
          multiline
          rows={3}
          fullWidth
          size="small"
          value={(answer as string) ?? ""}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={t.yourAnswer}
        />
      );

    case "nps":
      return (
        <Stack gap={1}>
          <Slider
            min={0}
            max={10}
            step={1}
            marks
            value={(answer as number) ?? 0}
            onChange={(_, val) => setAnswer(val as number)}
            valueLabelDisplay="auto"
          />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              {t.notLikely}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t.veryLikely}
            </Typography>
          </Stack>
        </Stack>
      );

    case "matrix": {
      const matrixAnswer = (answer as Record<string, string>) ?? {};
      return (
        <Stack gap={2} sx={{ overflowX: "auto" }}>
          {(question.matrixRows ?? []).map((row) => (
            <Stack key={row} gap={1}>
              <Typography variant="body2" fontWeight={500}>
                {row}
              </Typography>
              <RadioGroup
                row
                value={matrixAnswer[row] ?? ""}
                onChange={(e) =>
                  setAnswer({ ...matrixAnswer, [row]: e.target.value })
                }
              >
                {(question.matrixColumns ?? []).map((col) => (
                  <FormControlLabel
                    key={col}
                    value={col}
                    control={<Radio size="small" />}
                    label={col}
                  />
                ))}
              </RadioGroup>
            </Stack>
          ))}
        </Stack>
      );
    }

    case "contact":
      return (
        <Stack gap={2}>
          <TextField
            size="small"
            label={t.emailOptional}
            type="email"
            fullWidth
            value={((answer as Record<string, string>) ?? {}).email ?? ""}
            onChange={(e) =>
              setAnswer({
                ...((answer as Record<string, string>) ?? {}),
                email: e.target.value,
              })
            }
          />
          <TextField
            size="small"
            label={t.phoneOptional}
            type="tel"
            fullWidth
            value={((answer as Record<string, string>) ?? {}).phone ?? ""}
            onChange={(e) =>
              setAnswer({
                ...((answer as Record<string, string>) ?? {}),
                phone: e.target.value,
              })
            }
          />
        </Stack>
      );

    default:
      return null;
  }
};

const SurveyDrawer: React.FC<SurveyDrawerProps> = ({
  room,
  onClose,
  prefillRating,
  prefillEmail,
  prefillMessage,
}) => {
  const { language } = useRoom();
  const t = getSurveyT(language.code);

  const questions = room.survey?.questions ?? [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, SurveyAnswer>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const currentQuestion = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  const hasAnswer = (value: SurveyAnswer | undefined): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") {
      return Object.values(value).some((entry) => String(entry ?? "").trim().length > 0);
    }
    return true;
  };

  React.useEffect(() => {
    const seededAnswers: Record<string, SurveyAnswer> = {};

    for (const question of questions) {
      if ((question.type === "rating" || question.type === "nps") && prefillRating !== undefined) {
        seededAnswers[question.id] = prefillRating;
      }

      if (question.type === "open_text" && prefillMessage) {
        seededAnswers[question.id] = prefillMessage;
      }

      if (question.type === "contact" && prefillEmail) {
        seededAnswers[question.id] = {
          email: prefillEmail,
        };
      }
    }

    if (Object.keys(seededAnswers).length > 0) {
      setAnswers((prev) => ({ ...seededAnswers, ...prev }));
    }
  }, [prefillEmail, prefillMessage, prefillRating, questions]);

  const handleNext = () => {
    if (currentQuestion?.required && !hasAnswer(answers[currentQuestion.id])) {
      toast.error(t.required);
      return;
    }
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) throw new Error("API URL not configured");

      const surveyAnswers = questions.map((q) => ({
        questionId: q.id,
        questionText: q.text,
        questionType: q.type,
        answer: answers[q.id] ?? null,
      }));

      const body: any = {
        room: room.id,
        surveyAnswers,
        ...(prefillRating !== undefined ? { rating: prefillRating } : {}),
        ...(prefillEmail ? { email: prefillEmail } : {}),
        ...(prefillMessage ? { message: prefillMessage } : {}),
      };

      const response = await fetch(`${baseUrl}/v1/rooms/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to submit survey");

      toast.success(t.thankYou);
      setDone(true);
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (questions.length === 0) return null;

  return (
    <Drawer
      anchor="bottom"
      open={true}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        },
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 520,
          px: 3,
          py: 3,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          overflowY: "auto",
          flex: 1,
        }}
      >
        {done ? (
          <Stack spacing={3} alignItems="center" justifyContent="center" sx={{ py: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                bgcolor: "success.light",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
              }}
            >
              ✓
            </Box>
            <Typography variant="h6" fontWeight="bold" textAlign="center">
              {t.thankYou}
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {t.answersRecorded}
            </Typography>
            <Button variant="contained" onClick={onClose} sx={{ borderRadius: 2, px: 4 }}>
              {t.close}
            </Button>
          </Stack>
        ) : (
          <>
            <Stack gap={1}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {currentIdx + 1} / {questions.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {Math.round(progress)}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ borderRadius: 4, height: 6 }}
              />
            </Stack>

            {currentQuestion && (
              <Stack spacing={2.5} alignItems="center">
                <Typography
                  variant="h6"
                  fontWeight={600}
                  textAlign="center"
                  sx={{ fontSize: { xs: "1.05rem", sm: "1.2rem" }, lineHeight: 1.4 }}
                >
                  {currentQuestion.type === "contact"
                    ? t.contactQuestion
                    : currentQuestion.text}
                  {currentQuestion.required && currentQuestion.type !== "contact" && (
                    <Typography component="span" color="error"> *</Typography>
                  )}
                </Typography>
                <Box sx={{ width: "100%" }}>
                  <QuestionRenderer
                    question={currentQuestion}
                    answer={answers[currentQuestion.id]}
                    setAnswer={(val) =>
                      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }))
                    }
                    t={t}
                  />
                </Box>
              </Stack>
            )}

            <Stack direction="row" justifyContent="space-between" gap={2} sx={{ pt: 1 }}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={onClose}
                sx={{ borderRadius: 2, color: "text.secondary", borderColor: "divider" }}
              >
                {t.skip}
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={loading}
                sx={{ borderRadius: 2, flex: 1 }}
              >
                {loading
                  ? t.sending
                  : currentIdx < questions.length - 1
                  ? t.next
                  : t.submit}
              </Button>
            </Stack>
          </>
        )}
      </Box>
    </Drawer>
  );
};

export default SurveyDrawer;
