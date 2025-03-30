import { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Crown, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Make sure to call loadStripe outside of a component's render to avoid recreating the Stripe object on every render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

export default function Upgrade() {
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const isPro = user?.planType === 'pro';

  useEffect(() => {
    if (isPro) return;
    
    const getSubscription = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await apiRequest('POST', '/api/create-subscription');
        const data = await response.json();
        
        if (data.isSubscribed) {
          // User is already subscribed
          toast({
            title: "Already subscribed",
            description: "You are already subscribed to the Pro plan.",
          });
          return;
        }
        
        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error('Error creating subscription:', err);
        setError('Failed to initialize payment. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    getSubscription();
  }, [isPro, toast]);
  
  return (
    <DashboardLayout title="Upgrade to Pro" showAddButton={false}>
      <div className="max-w-3xl mx-auto">
        {isPro ? (
          <Card className="border-2 border-primary">
            <CardHeader className="text-center">
              <div className="mx-auto bg-primary-100 rounded-full p-3 w-12 h-12 flex items-center justify-center mb-4">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">You're on the Pro Plan!</CardTitle>
              <CardDescription>
                You're already enjoying all the benefits of our Pro plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>Unlimited reminders</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>Advanced notification options (Email, Push, SMS)</span>
                </div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>Priority support</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <p className="text-sm text-gray-500">
                Your subscription will renew automatically. Manage your subscription in the settings.
              </p>
            </CardFooter>
          </Card>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold mb-2">Upgrade to Pro and get more out of ReminderPro</h1>
              <p className="text-gray-600">
                Enjoy unlimited reminders and advanced notification options for just $9.99/month.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Free Plan</CardTitle>
                  <CardDescription>Current Plan</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">$0</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      <span>Limited to {user?.reminderLimit || 10} reminders</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      <span>Basic notifications (Email, Push)</span>
                    </div>
                    <div className="flex items-center text-gray-400">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <span>No SMS notifications</span>
                    </div>
                    <div className="flex items-center text-gray-400">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <span>Standard support</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-2 border-primary relative">
                <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-primary text-white text-xs font-bold py-1 px-3 rounded-full">
                  RECOMMENDED
                </div>
                <CardHeader>
                  <CardTitle>Pro Plan</CardTitle>
                  <CardDescription>Recommended Plan</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">$9.99</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      <span className="font-medium">Unlimited reminders</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      <span className="font-medium">Advanced notifications (Email, Push, SMS)</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      <span className="font-medium">Priority support</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      <span className="font-medium">Cancel anytime</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-8">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {isLoading ? (
                <div className="flex justify-center my-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : clientSecret ? (
                <Elements 
                  stripe={stripePromise} 
                  options={{ clientSecret, appearance: { theme: 'stripe' } }}
                >
                  <CheckoutForm />
                </Elements>
              ) : null}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
    });

    if (error) {
      setErrorMessage(error.message || 'An error occurred during payment.');
      toast({
        title: "Payment Failed",
        description: error.message || 'An error occurred during payment.',
        variant: "destructive",
      });
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white p-6 rounded-lg border mb-4">
        <h3 className="text-lg font-medium mb-4">Payment Information</h3>
        <PaymentElement />
      </div>
      
      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Payment Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex justify-end">
        <Button 
          type="submit" 
          className="bg-primary hover:bg-primary/90"
          disabled={!stripe || !elements || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Subscribe Now'
          )}
        </Button>
      </div>
    </form>
  );
}
