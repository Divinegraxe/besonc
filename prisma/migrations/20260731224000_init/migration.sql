CREATE TYPE public."OrderState" AS ENUM (
    'placed',
    'vendor_accepted',
    'preparing',
    'ready_for_pickup',
    'rider_assigned',
    'rider_at_vendor',
    'picked_up',
    'in_transit',
    'arrived',
    'delivered',
    'vendor_rejected',
    'vendor_cancelled',
    'customer_cancelled',
    'rider_unassigned',
    'payment_failed',
    'prescription_review',
    'prescription_rejected',
    'prescription_modified',
    'rider_assigned_pickup',
    'rider_at_customer_pickup',
    'picked_up_from_customer',
    'delivered_to_vendor',
    'vendor_received',
    'processing',
    'vendor_done',
    'rider_assigned_return',
    'rider_at_vendor_return',
    'picked_up_return',
    'in_transit_return',
    'delivered_return',
    'customer_cancelled_pickup',
    'rider_cancelled'
);
CREATE TYPE public."PaymentMethod" AS ENUM (
    'momo',
    'card',
    'cash',
    'wallet'
);
CREATE TYPE public."PaymentStatus" AS ENUM (
    'pending',
    'paid',
    'failed',
    'refunded'
);
CREATE TYPE public."ServiceCode" AS ENUM (
    'FO',
    'GR',
    'SH',
    'MK',
    'PH',
    'LD',
    'PR',
    'ER',
    'TR'
);
CREATE TYPE public."VendorType" AS ENUM (
    'business',
    'individual'
);
CREATE TABLE public.item (
    id text NOT NULL,
    "vendorId" text NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    "pricePesewas" integer NOT NULL,
    "imageUrl" character varying(500),
    available boolean DEFAULT true NOT NULL,
    category character varying(50) NOT NULL,
    "preparationMinutes" integer DEFAULT 15 NOT NULL,
    tags text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    addons jsonb,
    variants jsonb
);
CREATE TABLE public.vendor (
    id text NOT NULL,
    name character varying(120) NOT NULL,
    description text,
    "logoUrl" character varying(500),
    "bannerUrl" character varying(500),
    type public."VendorType" NOT NULL,
    city character varying(8) NOT NULL,
    category public."ServiceCode" NOT NULL,
    rating numeric(2,1) DEFAULT 0 NOT NULL,
    "reviewCount" integer DEFAULT 0 NOT NULL,
    "prepTimeMinutes" integer DEFAULT 20 NOT NULL,
    "minimumOrderPesewas" integer DEFAULT 0 NOT NULL,
    "deliveryFeePesewas" integer DEFAULT 0 NOT NULL,
    address character varying(300) NOT NULL,
    latitude numeric(10,7) NOT NULL,
    longitude numeric(10,7) NOT NULL,
    phone character varying(20) NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.vendor_hour (
    id text NOT NULL,
    "vendorId" text NOT NULL,
    "dayOfWeek" integer NOT NULL,
    "openTime" character varying(5) NOT NULL,
    "closeTime" character varying(5) NOT NULL,
    "isClosed" boolean DEFAULT false NOT NULL
);
ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.vendor_hour
    ADD CONSTRAINT vendor_hour_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.vendor
    ADD CONSTRAINT vendor_pkey PRIMARY KEY (id);
CREATE INDEX "item_vendorId_available_idx" ON public.item USING btree ("vendorId", available);
CREATE INDEX "item_vendorId_category_idx" ON public.item USING btree ("vendorId", category);
CREATE INDEX "vendor_category_isActive_idx" ON public.vendor USING btree (category, "isActive");
CREATE INDEX "vendor_city_category_isActive_idx" ON public.vendor USING btree (city, category, "isActive");
CREATE UNIQUE INDEX "vendor_hour_vendorId_dayOfWeek_key" ON public.vendor_hour USING btree ("vendorId", "dayOfWeek");
CREATE INDEX "vendor_hour_vendorId_idx" ON public.vendor_hour USING btree ("vendorId");
CREATE INDEX vendor_name_idx ON public.vendor USING btree (name);
ALTER TABLE ONLY public.item
    ADD CONSTRAINT "item_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendor(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.vendor_hour
    ADD CONSTRAINT "vendor_hour_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendor(id) ON UPDATE CASCADE ON DELETE CASCADE;
