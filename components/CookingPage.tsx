'use client';

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ElevenLabsWidget } from '@/components/ElevenLabsWidget'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { type CarouselApi } from 'embla-carousel-react'

const images = [
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_01_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_06_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_12_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_13_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_16_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_17_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_21_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_24_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_26_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_27_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_30_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_34_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_35_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_42_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_46_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_50_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_54_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_56_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_60_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_62_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_63_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_68_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_71_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_74_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_78_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_81_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_84_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_85_Image_0001.jpg',
  '/images/Oliver/Oliver_Dzh_-_Vybor_Dzheymi_Mirovaya_Kukhnya_-_dzheymi_I_Druzya_-_2016_Page_90_Image_0001.jpg'
]

export default function CookingPage() {
  const [api, setApi] = useState<CarouselApi>()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Set loading to false once component is mounted
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!api) return

    const interval = setInterval(() => {
      api.scrollNext()
    }, 5000)

    return () => clearInterval(interval)
  }, [api])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-black">
      <div className="w-full max-w-4xl relative mt-8">
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          setApi={setApi}
          className="w-full"
        >
          <CarouselContent>
            {images.map((src, index) => (
              <CarouselItem key={index} className="relative h-[600px]">
                <Image
                  src={src}
                  alt={`Cooking image ${index + 1}`}
                  fill
                  className="object-contain"
                  priority={index === 0}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="absolute left-4 top-1/2 transform -translate-y-1/2" />
          <CarouselNext className="absolute right-4 top-1/2 transform -translate-y-1/2" />
        </Carousel>
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm flex justify-center items-center p-8">
        <div className="w-[600px]">
          <ElevenLabsWidget agentId="B6bJjXHUAXxioEdINklW" />
        </div>
      </div>
    </div>
  )
} 