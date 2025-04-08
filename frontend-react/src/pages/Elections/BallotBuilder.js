import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  Grid,
  Paper,
  IconButton,
  Divider,
  InputAdornment,
} from "@mui/material";
import {
  ArrowUpward,
  ArrowDownward,
  FileCopy,
  Delete,
  Edit,
  CalendarToday,
  AccessTime,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../../components/Layout/DashboardLayout";

// Custom styled components
const StepItem = styled(Box)(({ theme, active }) => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  position: "relative",
  cursor: "pointer",
  "& .step-number": {
    width: 36,
    height: 36,
    borderRadius: "50%",
    backgroundColor: active ? theme.palette.primary.main : "#e0e0e0",
    color: active ? "white" : "#666",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    fontWeight: "bold",
    fontSize: 16,
  },
  "& .step-label": {
    fontSize: 16,
    color: active ? theme.palette.primary.main : "#666",
    fontWeight: active ? "bold" : "normal",
  },
}));

const StepConnector = styled(Box)(({ theme }) => ({
  height: 2,
  width: 60,
  backgroundColor: "#e0e0e0",
  margin: "0 8px",
  alignSelf: "center",
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  padding: 4,
  color: "#7C8DA7",
}));

function BallotBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const step = parseInt(queryParams.get("step") || "1");

  // Navigate to a specific step
  const goToStep = (stepNumber) => {
    navigate(`/ballot/new?step=${stepNumber}`);
  };

  // Handle next button click
  const handleNext = () => {
    if (step < 4) {
      goToStep(step + 1);
    } else {
      // On final step, submit the form
      // TODO: Implement form submission logic
      navigate("/elections");
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ px: 4, py: 3, backgroundColor: "#FFFFFF" }}>
        {/* Steps Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <StepItem active={step >= 1} onClick={() => goToStep(1)}>
              <Box className="step-number">1</Box>
              <Box className="step-label">Build Ballot</Box>
            </StepItem>
            <StepConnector />
            <StepItem active={step >= 2} onClick={() => goToStep(2)}>
              <Box className="step-number">2</Box>
              <Box className="step-label">Set Duration</Box>
            </StepItem>
            <StepConnector />
            <StepItem active={step >= 3} onClick={() => goToStep(3)}>
              <Box className="step-number">3</Box>
              <Box className="step-label">Select # of Participants</Box>
            </StepItem>
            <StepConnector />
            <StepItem active={step >= 4} onClick={() => goToStep(4)}>
              <Box className="step-number">4</Box>
              <Box className="step-label">Confirm + Pay</Box>
            </StepItem>
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={handleNext}
            sx={{ width: "240px" }}
          >
            {step < 4 ? "Next" : "Finish"}
          </Button>
        </Box>

        {/* Step Content */}
        {step === 1 && <BuildBallotStep />}
        {step === 2 && <SetDurationStep />}
        {step === 3 && <SetParticipantsStep />}
        {step === 4 && <ConfirmPayStep />}
      </Box>
    </DashboardLayout>
  );
}

// Step 1: Build Ballot
function BuildBallotStep() {
  const [title, setTitle] = useState("Election Title");
  const [questions, setQuestions] = useState([
    {
      id: 1,
      title: "Question Title Here",
      description: "",
      allowWriteIn: false,
      options: [],
    },
  ]);

  const addQuestion = () => {
    const newQuestion = {
      id: questions.length + 1,
      title: `Question ${questions.length + 1}`,
      description: "",
      allowWriteIn: false,
      options: [],
    };
    setQuestions([...questions, newQuestion]);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Build Ballot
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Content
            </Typography>
            <Box>
              {questions.map((question, index) => (
                <Box
                  key={question.id}
                  sx={{
                    p: 2,
                    mb: 1,
                    border: "1px solid #eee",
                    borderRadius: 1,
                    cursor: "pointer",
                    "&:hover": { backgroundColor: "#f9f9f9" },
                  }}
                >
                  <Typography variant="caption" color="textSecondary">
                    | question {index + 1}
                  </Typography>
                  <Typography variant="body1">{question.title}</Typography>
                </Box>
              ))}
              <Button
                sx={{ color: "primary.main", mt: 1 }}
                onClick={addQuestion}
              >
                + Add New Question
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            {/* Election Title as text with pencil icon */}
            <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
              <Typography variant="h5" fontWeight="bold" sx={{ mr: 1 }}>
                {title}
              </Typography>
              <IconButton
                sx={{
                  p: 0.5,
                  backgroundColor: "#f5f5f5",
                  borderRadius: 1,
                }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Box>

            {/* Question section - directly inside the same paper as the title */}
            {questions.length > 0 && (
              <Box
                sx={{
                  mt: 3,
                  border: "1px solid #e0e0e0",
                  borderRadius: "4px",
                  padding: "1px",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                    p: 1,
                    borderRadius: "4px 4px 0 0",
                    backgroundColor: "#e8e8e8",
                  }}
                >
                  <Typography variant="subtitle1" fontWeight="bold">
                    Question {questions[0].id}
                  </Typography>
                  <Box>
                    <ActionButton>
                      <ArrowUpward fontSize="small" />
                    </ActionButton>
                    <ActionButton>
                      <ArrowDownward fontSize="small" />
                    </ActionButton>
                    <Box
                      component="span"
                      sx={{
                        mx: 1,
                        borderLeft: "1px solid #ddd",
                        height: "20px",
                      }}
                    />
                    <ActionButton>
                      <FileCopy fontSize="small" />
                    </ActionButton>
                    <ActionButton>
                      <Delete fontSize="small" />
                    </ActionButton>
                  </Box>
                </Box>

                <Box sx={{ px: 2, pb: 2 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, fontWeight: 500, color: "#555" }}
                  >
                    Question Title
                  </Typography>
                  <TextField
                    fullWidth
                    variant="outlined"
                    value={questions[0].title}
                    onChange={(e) => {
                      const updatedQuestions = [...questions];
                      updatedQuestions[0].title = e.target.value;
                      setQuestions(updatedQuestions);
                    }}
                    sx={{ mb: 3 }}
                  />

                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, fontWeight: 500, color: "#555" }}
                  >
                    Description (optional)
                  </Typography>
                  <TextField
                    fullWidth
                    variant="outlined"
                    multiline
                    rows={3}
                    placeholder="Type here"
                    value={questions[0].description}
                    onChange={(e) => {
                      const updatedQuestions = [...questions];
                      updatedQuestions[0].description = e.target.value;
                      setQuestions(updatedQuestions);
                    }}
                    sx={{ mb: 2 }}
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={questions[0].allowWriteIn}
                        onChange={(e) => {
                          const updatedQuestions = [...questions];
                          updatedQuestions[0].allowWriteIn = e.target.checked;
                          setQuestions(updatedQuestions);
                        }}
                      />
                    }
                    label="Allow write in"
                  />

                  <Box sx={{ mt: 3 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      sx={{ borderStyle: "dashed", py: 1.5 }}
                    >
                      + Type here
                    </Button>
                  </Box>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

// Step 2: Set Duration
function SetDurationStep() {
  const [startDate, setStartDate] = useState("November 5, 2024");
  const [startTime, setStartTime] = useState("12:00 AM");
  const [endDate, setEndDate] = useState("November 12, 2024");
  const [endTime, setEndTime] = useState("12:00 AM");

  // Custom date/time input component
  const DateTimeInput = ({ icon, label, value, onClick }) => (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        p: "10px 16px",
        mb: 1.5,
        borderRadius: 1,
        border: "1px solid #E0E0E0",
        cursor: "pointer",
        transition: "all 0.2s",
        maxWidth: "270px",
        "&:hover": {
          backgroundColor: "#f9f9f9",
          borderColor: "#ccc",
        },
      }}
    >
      <Box sx={{ color: "#757575", mr: 2, mt: 0.25 }}>{icon}</Box>
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 500, mb: 0.25 }}
        >
          {label}
        </Typography>
        <Typography
          variant="body1"
          fontWeight="500"
          sx={{ whiteSpace: "nowrap" }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );

  // Mock handlers for opening date/time pickers
  const handleOpenDatePicker = (type) => {
    console.log(`Opening date picker for ${type}`);
    // Would open a real date picker in production
  };

  const handleOpenTimePicker = (type) => {
    console.log(`Opening time picker for ${type}`);
    // Would open a real time picker in production
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        How long will the election run for?
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        {/* Duration header with blue dot */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#3F51B5",
              mr: 2,
            }}
          />
          <Typography variant="h6" fontWeight="medium">
            Duration
          </Typography>
        </Box>

        {/* Election Start Time section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", mb: 3 }}>
            <Box sx={{ width: "50%" }}>
              <Typography variant="subtitle1" fontWeight="600">
                Election Start Time
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Set the time and date for when your election will start
              </Typography>
            </Box>

            <Box sx={{ width: "50%" }}>
              <Box sx={{ width: "45%" }}>
                <DateTimeInput
                  icon={<CalendarToday />}
                  label="Date"
                  value={startDate}
                  onClick={() => handleOpenDatePicker("start")}
                />
                <DateTimeInput
                  icon={<AccessTime />}
                  label="Time"
                  value={startTime}
                  onClick={() => handleOpenTimePicker("start")}
                />
              </Box>
            </Box>
          </Box>

          {/* Election End Time section */}
          <Box sx={{ display: "flex" }}>
            <Box sx={{ width: "50%" }}>
              <Typography variant="subtitle1" fontWeight="600">
                Election End Time
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Set the time and date for when your election will end
              </Typography>
            </Box>

            <Box sx={{ width: "50%" }}>
              <Box sx={{ width: "45%" }}>
                <DateTimeInput
                  icon={<CalendarToday />}
                  label="Date"
                  value={endDate}
                  onClick={() => handleOpenDatePicker("end")}
                />
                <DateTimeInput
                  icon={<AccessTime />}
                  label="Time"
                  value={endTime}
                  onClick={() => handleOpenTimePicker("end")}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

// Step 3: Set Participants
function SetParticipantsStep() {
  const [voterCount, setVoterCount] = useState(10);
  const pricePerVoter = 0.1;

  const handleDecrease = () => {
    if (voterCount > 1) {
      setVoterCount(voterCount - 1);
    }
  };

  const handleIncrease = () => {
    setVoterCount(voterCount + 1);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        How many voters can preregister?
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "primary.main",
              mr: 1,
            }}
          />
          <Typography variant="h6">Number of voters</Typography>
        </Box>

        <Box
          sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}
        >
          <Box sx={{ flex: 1, mb: { xs: 2, md: 0 } }}>
            <Typography variant="body2" color="textSecondary">
              Set the number of voters
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              The cost to run an election depends on the number of voters
              allowed to preregister.
            </Typography>
          </Box>

          <Box sx={{ textAlign: "center" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 1,
              }}
            >
              <IconButton
                onClick={handleDecrease}
                size="small"
                sx={{ border: "1px solid #ddd", borderRadius: "50%" }}
              >
                <Box component="span" sx={{ fontSize: 16, lineHeight: 1 }}>
                  -
                </Box>
              </IconButton>

              <TextField
                value={voterCount}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setVoterCount(value);
                }}
                sx={{
                  width: 60,
                  mx: 2,
                  "& input": { textAlign: "center" },
                }}
                inputProps={{ min: 1 }}
              />

              <IconButton
                onClick={handleIncrease}
                size="small"
                sx={{ border: "1px solid #ddd", borderRadius: "50%" }}
              >
                <Box component="span" sx={{ fontSize: 16, lineHeight: 1 }}>
                  +
                </Box>
              </IconButton>
            </Box>

            <Typography variant="body2" sx={{ mb: 3 }}>
              voters
            </Typography>

            <Box sx={{ textAlign: "left", width: 200, mx: "auto" }}>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="textSecondary">
                  Price per voter
                </Typography>
                <Typography variant="body2">
                  ${pricePerVoter.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1" fontWeight="bold">
                  Total
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  ${(voterCount * pricePerVoter).toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

// Step 4: Confirm and Pay
function ConfirmPayStep() {
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardholderName, setCardholderName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [sameAddress, setSameAddress] = useState(true);

  // Mock data
  const electionData = {
    questions: 11,
    startDate: "November 5, 2024, 12:00am",
    endDate: "November 12, 2024, 12:00am",
    voters: 10,
    pricePerVoter: 0.1,
    total: 1.0,
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Final Step!
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "primary.main",
                  mr: 1,
                }}
              />
              <Typography variant="h6">Review your election details</Typography>
            </Box>

            <Typography
              variant="subtitle1"
              fontWeight="bold"
              sx={{ mt: 3, mb: 2 }}
            >
              Ballot Details
            </Typography>

            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body2" color="textSecondary">
                Ballot:
              </Typography>
              <Typography variant="body2" color="textSecondary">
                x {electionData.questions} Questions
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              Duration
            </Typography>

            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body2" color="textSecondary">
                Starts:
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {electionData.startDate}
              </Typography>
            </Box>

            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body2" color="textSecondary">
                Ends:
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {electionData.endDate}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              Number of Voters
            </Typography>

            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body2" color="textSecondary">
                Voters:
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {electionData.voters} voters x $
                {electionData.pricePerVoter.toFixed(2)}
              </Typography>
            </Box>

            <Box
              sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Total Amount:
              </Typography>
              <Typography variant="subtitle1" fontWeight="bold">
                ${electionData.total.toFixed(2)}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "primary.main",
                  mr: 1,
                }}
              />
              <Typography variant="h6">Payment Details</Typography>
            </Box>

            <Typography
              variant="subtitle1"
              fontWeight="bold"
              sx={{ mt: 3, mb: 2 }}
            >
              Payment method
            </Typography>

            <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
              <Paper
                elevation={paymentMethod === "card" ? 3 : 1}
                sx={{
                  p: 2,
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  border:
                    paymentMethod === "card"
                      ? "2px solid primary.main"
                      : "1px solid #ddd",
                  cursor: "pointer",
                }}
                onClick={() => setPaymentMethod("card")}
              >
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: "1px solid #666",
                    position: "relative",
                    mr: 2,
                  }}
                >
                  {paymentMethod === "card" && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "primary.main",
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ mr: 2 }}>💳</Box>
                <Typography>Card</Typography>
              </Paper>

              <Paper
                elevation={paymentMethod === "bank" ? 3 : 1}
                sx={{
                  p: 2,
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  border:
                    paymentMethod === "bank"
                      ? "2px solid primary.main"
                      : "1px solid #ddd",
                  cursor: "pointer",
                }}
                onClick={() => setPaymentMethod("bank")}
              >
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: "1px solid #666",
                    position: "relative",
                    mr: 2,
                  }}
                >
                  {paymentMethod === "bank" && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "primary.main",
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ mr: 2 }}>🏦</Box>
                <Typography>US bank account</Typography>
              </Paper>
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Card holder name"
                placeholder="Ex: John Doe"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                sx={{ mb: 2 }}
              />

              <TextField
                select
                fullWidth
                label="Billing address"
                value="US"
                sx={{ mb: 2 }}
                SelectProps={{
                  native: true,
                }}
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="UK">United Kingdom</option>
              </TextField>

              <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                <TextField
                  label="Zip code"
                  placeholder="Ex: 73923"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="City"
                  placeholder="Ex: New York"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  sx={{ flex: 1 }}
                />
              </Box>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={sameAddress}
                    onChange={(e) => setSameAddress(e.target.checked)}
                  />
                }
                label="Billing address is same as shipping"
              />
            </Box>

            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              sx={{ mb: 2 }}
            >
              Confirm and Pay ${electionData.total.toFixed(2)}
            </Button>

            <Typography
              variant="caption"
              color="textSecondary"
              align="center"
              sx={{ display: "block" }}
            >
              By clicking "Confirm and Pay," you agree to our{" "}
              <a href="#">Terms and Conditions</a>
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default BallotBuilder;
